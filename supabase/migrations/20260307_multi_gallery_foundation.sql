begin;

-- Preflight: avoid silent route-space conflicts for the required initial seed slug.
do $$
begin
  if exists (
    select 1
    from public.pages
    where slug = 'test'
      and deleted_at is null
  ) then
    raise exception 'Preflight failed: initial gallery slug "test" conflicts with an existing page slug.';
  end if;

  if exists (
    select 1
    from public.pages
    where slug = 'all'
      and deleted_at is null
  ) then
    raise exception 'Preflight failed: reserved slug "all" conflicts with an existing page slug.';
  end if;
end
$$;

create type public.gallery_settings_scope as enum ('gallery', 'all');

create table public.galleries (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text,
  seo_title text,
  seo_description text,
  is_active boolean not null default true,
  show_in_nav boolean not null default true,
  nav_order integer not null default 0,
  created_by uuid references auth.users (id) on delete set null,
  updated_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create unique index galleries_name_ci_unique on public.galleries (lower(name));
create index galleries_nav_idx
  on public.galleries (is_active, show_in_nav, nav_order, name);

create table public.gallery_settings (
  id uuid primary key default gen_random_uuid(),
  scope public.gallery_settings_scope not null,
  gallery_id uuid references public.galleries (id) on delete cascade,
  theme_default public.theme_mode not null default 'system',
  grid_desktop_default integer not null default 6 check (grid_desktop_default between 1 and 30),
  grid_mobile_default integer not null default 3 check (grid_mobile_default between 1 and 8),
  max_content_width_px integer check (max_content_width_px is null or max_content_width_px > 0),
  gallery_layout_mode public.layout_mode not null default 'uniform',
  gallery_gap_px integer not null default 8 check (gallery_gap_px >= 0 and gallery_gap_px <= 20),
  uniform_thumb_ratio numeric(5, 3) not null default 1.000 check (uniform_thumb_ratio > 0 and uniform_thumb_ratio <= 3),
  transition_preset public.transition_preset not null default 'cinematic',
  allow_transition_toggle boolean not null default true,
  show_search_bar boolean not null default true,
  show_photograph_info boolean not null default true,
  show_thumbnail_zoom_hover boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  updated_by uuid references auth.users (id) on delete set null,
  check (
    (scope = 'gallery' and gallery_id is not null)
    or (scope = 'all' and gallery_id is null)
  )
);

create unique index gallery_settings_one_per_gallery
  on public.gallery_settings (gallery_id)
  where scope = 'gallery';

create unique index gallery_settings_one_all
  on public.gallery_settings (scope)
  where scope = 'all';

create table public.gallery_slug_history (
  id bigint generated always as identity primary key,
  gallery_id uuid not null references public.galleries (id) on delete cascade,
  old_slug text not null,
  created_at timestamptz not null default timezone('utc', now()),
  unique (gallery_id, old_slug)
);

create index gallery_slug_history_lookup_idx
  on public.gallery_slug_history (old_slug, created_at desc);

create table public.photo_slug_history (
  id bigint generated always as identity primary key,
  photo_id uuid not null references public.photos (id) on delete cascade,
  old_gallery_id uuid not null references public.galleries (id) on delete cascade,
  old_slug text not null,
  created_at timestamptz not null default timezone('utc', now()),
  unique (photo_id, old_gallery_id, old_slug)
);

create index photo_slug_history_lookup_idx
  on public.photo_slug_history (old_gallery_id, old_slug, created_at desc);

insert into public.galleries (slug, name, is_active, show_in_nav, nav_order)
values ('test', 'Test', true, true, 0)
on conflict (slug) do nothing;

alter table public.photos
  add column if not exists gallery_id uuid references public.galleries (id) on delete restrict,
  add column if not exists gallery_sort_order integer;

with seed as (
  select id
  from public.galleries
  where slug = 'test'
  limit 1
)
update public.photos p
set gallery_id = seed.id
from seed
where p.gallery_id is null;

update public.photos
set gallery_sort_order = admin_sort_order
where gallery_sort_order is null;

alter table public.photos
  alter column gallery_id set not null;

alter table public.photos drop constraint if exists photos_slug_key;
drop index if exists public.photos_slug_key;

create unique index photos_gallery_slug_unique
  on public.photos (gallery_id, slug);

drop index if exists photos_admin_sort_idx;
create index photos_gallery_sort_idx
  on public.photos (gallery_id, gallery_sort_order nulls last, updated_at desc);

create index photos_gallery_public_order_idx
  on public.photos (
    gallery_id,
    status,
    deleted_at,
    gallery_sort_order nulls last,
    capture_date desc,
    created_at desc,
    id desc
  );

-- Global /all ordering index (active-gallery filtering still performed in query join).
create index photos_all_public_order_idx
  on public.photos (
    status,
    deleted_at,
    capture_date desc,
    created_at desc,
    id desc
  );

alter table public.photos drop column if exists admin_sort_order;

create or replace function public.tg_gallery_settings_set_actor()
returns trigger
language plpgsql
as $$
begin
  new.updated_by := auth.uid();
  return new;
end;
$$;

create or replace function public.tg_gallery_settings_restrict_sensitive_fields()
returns trigger
language plpgsql
as $$
begin
  if tg_op <> 'UPDATE' then
    return new;
  end if;

  if auth.uid() is null or coalesce(auth.role(), '') = 'service_role' then
    return new;
  end if;

  if not public.cms_is_admin() then
    if new.transition_preset is distinct from old.transition_preset then
      raise exception 'Only admins can update transition preset.';
    end if;
  end if;

  return new;
end;
$$;

create or replace function public.tg_gallery_slug_history()
returns trigger
language plpgsql
as $$
begin
  if new.slug is distinct from old.slug then
    insert into public.gallery_slug_history (gallery_id, old_slug)
    values (old.id, old.slug)
    on conflict (gallery_id, old_slug) do nothing;
  end if;

  return new;
end;
$$;

create or replace function public.tg_photo_slug_history()
returns trigger
language plpgsql
as $$
begin
  if new.slug is distinct from old.slug
     or new.gallery_id is distinct from old.gallery_id then
    insert into public.photo_slug_history (photo_id, old_gallery_id, old_slug)
    values (old.id, old.gallery_id, old.slug)
    on conflict (photo_id, old_gallery_id, old_slug) do nothing;
  end if;

  return new;
end;
$$;

create trigger galleries_set_updated_at
before update on public.galleries
for each row execute function public.tg_set_updated_at();

create trigger galleries_set_actor
before insert or update on public.galleries
for each row execute function public.tg_set_actor_fields();

create trigger galleries_slug_history
before update of slug on public.galleries
for each row execute function public.tg_gallery_slug_history();

create trigger gallery_settings_set_updated_at
before update on public.gallery_settings
for each row execute function public.tg_set_updated_at();

create trigger gallery_settings_set_actor
before insert or update on public.gallery_settings
for each row execute function public.tg_gallery_settings_set_actor();

create trigger gallery_settings_restrict_sensitive_fields
before update on public.gallery_settings
for each row execute function public.tg_gallery_settings_restrict_sensitive_fields();

create trigger photos_slug_history
before update of slug, gallery_id on public.photos
for each row execute function public.tg_photo_slug_history();

alter table public.galleries enable row level security;
alter table public.gallery_settings enable row level security;
alter table public.gallery_slug_history enable row level security;
alter table public.photo_slug_history enable row level security;

create policy galleries_public_read
on public.galleries
for select
using (true);

create policy galleries_admin_write
on public.galleries
for all
using (public.cms_is_admin())
with check (public.cms_is_admin());

create policy gallery_settings_public_read
on public.gallery_settings
for select
using (true);

create policy gallery_settings_editor_write
on public.gallery_settings
for all
using (public.cms_can_edit())
with check (public.cms_can_edit());

create policy gallery_slug_history_public_read
on public.gallery_slug_history
for select
using (true);

create policy gallery_slug_history_admin_write
on public.gallery_slug_history
for all
using (public.cms_is_admin())
with check (public.cms_is_admin());

create policy photo_slug_history_public_read
on public.photo_slug_history
for select
using (true);

create policy photo_slug_history_editor_write
on public.photo_slug_history
for all
using (public.cms_can_edit())
with check (public.cms_can_edit());

with defaults as (
  select
    theme_default,
    grid_desktop_default,
    grid_mobile_default,
    max_content_width_px,
    gallery_layout_mode,
    gallery_gap_px,
    uniform_thumb_ratio,
    transition_preset,
    allow_transition_toggle,
    show_search_bar,
    show_photograph_info,
    show_thumbnail_zoom_hover
  from public.site_settings
  where singleton_id = 1
)
insert into public.gallery_settings (
  scope,
  gallery_id,
  theme_default,
  grid_desktop_default,
  grid_mobile_default,
  max_content_width_px,
  gallery_layout_mode,
  gallery_gap_px,
  uniform_thumb_ratio,
  transition_preset,
  allow_transition_toggle,
  show_search_bar,
  show_photograph_info,
  show_thumbnail_zoom_hover
)
select
  'gallery',
  g.id,
  d.theme_default,
  d.grid_desktop_default,
  d.grid_mobile_default,
  d.max_content_width_px,
  d.gallery_layout_mode,
  d.gallery_gap_px,
  d.uniform_thumb_ratio,
  d.transition_preset,
  d.allow_transition_toggle,
  d.show_search_bar,
  d.show_photograph_info,
  d.show_thumbnail_zoom_hover
from public.galleries g
cross join defaults d
where g.slug = 'test'
on conflict do nothing;

with defaults as (
  select
    theme_default,
    grid_desktop_default,
    grid_mobile_default,
    max_content_width_px,
    gallery_layout_mode,
    gallery_gap_px,
    uniform_thumb_ratio,
    transition_preset,
    allow_transition_toggle,
    show_search_bar,
    show_photograph_info,
    show_thumbnail_zoom_hover
  from public.site_settings
  where singleton_id = 1
)
insert into public.gallery_settings (
  scope,
  gallery_id,
  theme_default,
  grid_desktop_default,
  grid_mobile_default,
  max_content_width_px,
  gallery_layout_mode,
  gallery_gap_px,
  uniform_thumb_ratio,
  transition_preset,
  allow_transition_toggle,
  show_search_bar,
  show_photograph_info,
  show_thumbnail_zoom_hover
)
select
  'all',
  null,
  d.theme_default,
  d.grid_desktop_default,
  d.grid_mobile_default,
  d.max_content_width_px,
  d.gallery_layout_mode,
  d.gallery_gap_px,
  d.uniform_thumb_ratio,
  d.transition_preset,
  d.allow_transition_toggle,
  d.show_search_bar,
  d.show_photograph_info,
  d.show_thumbnail_zoom_hover
from defaults d
on conflict do nothing;

create or replace function public.reorder_gallery_photos(
  p_gallery_id uuid,
  p_ordered_photo_ids uuid[]
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  if not public.cms_can_edit() then
    raise exception 'Unauthorized';
  end if;

  if p_ordered_photo_ids is null or coalesce(array_length(p_ordered_photo_ids, 1), 0) = 0 then
    raise exception 'No photo IDs provided';
  end if;

  if not exists (
    select 1
    from public.galleries g
    where g.id = p_gallery_id
  ) then
    raise exception 'Gallery not found';
  end if;

  if exists (
    select 1
    from unnest(p_ordered_photo_ids) as ids(id)
    left join public.photos p
      on p.id = ids.id
     and p.gallery_id = p_gallery_id
    where p.id is null
  ) then
    raise exception 'Ordered IDs must all belong to the target gallery';
  end if;

  with raw_ids as (
    select id, ord
    from unnest(p_ordered_photo_ids) with ordinality as t(id, ord)
  ),
  ordered_ids as (
    select distinct on (id) id, ord
    from raw_ids
    order by id, ord
  )
  update public.photos p
  set gallery_sort_order = o.ord - 1
  from ordered_ids o
  where p.id = o.id
    and p.gallery_id = p_gallery_id;
end;
$$;

create or replace function public.reorder_photos(p_ordered_photo_ids uuid[])
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_gallery_id uuid;
  v_count integer;
begin
  if p_ordered_photo_ids is null or coalesce(array_length(p_ordered_photo_ids, 1), 0) = 0 then
    raise exception 'No photo IDs provided';
  end if;

  select min(p.gallery_id), count(distinct p.gallery_id)
  into v_gallery_id, v_count
  from public.photos p
  where p.id = any(p_ordered_photo_ids);

  if v_gallery_id is null then
    raise exception 'No valid photo IDs provided';
  end if;

  if v_count > 1 then
    raise exception 'reorder_photos requires IDs from a single gallery';
  end if;

  perform public.reorder_gallery_photos(v_gallery_id, p_ordered_photo_ids);
end;
$$;

create or replace function public.gallery_photo_neighbors_scoped(
  p_gallery_id uuid,
  p_photo_id uuid
)
returns table (
  prev_slug text,
  next_slug text
)
language sql
security invoker
set search_path = public
as $$
  with ordered as (
    select
      p.id,
      p.slug,
      row_number() over (
        order by
          p.gallery_sort_order asc nulls last,
          coalesce(p.capture_date, '') desc,
          p.created_at desc,
          p.id desc
      ) as rn
    from public.photos p
    where p.gallery_id = p_gallery_id
      and p.status = 'published'
      and p.deleted_at is null
  ),
  ranked as (
    select
      o.*,
      count(*) over () as total
    from ordered o
  ),
  current_row as (
    select *
    from ranked
    where id = p_photo_id
    limit 1
  ),
  prev_row as (
    select r.slug
    from ranked r
    join current_row c
      on r.rn = case when c.rn = 1 then c.total else c.rn - 1 end
  ),
  next_row as (
    select r.slug
    from ranked r
    join current_row c
      on r.rn = case when c.rn = c.total then 1 else c.rn + 1 end
  )
  select
    (select slug from prev_row),
    (select slug from next_row);
$$;

create or replace function public.all_photo_neighbors(
  p_photo_id uuid
)
returns table (
  prev_slug text,
  next_slug text
)
language sql
security invoker
set search_path = public
as $$
  with ordered as (
    select
      p.id,
      p.slug,
      row_number() over (
        order by
          coalesce(p.capture_date, '') desc,
          p.created_at desc,
          p.id desc
      ) as rn
    from public.photos p
    join public.galleries g on g.id = p.gallery_id
    where p.status = 'published'
      and p.deleted_at is null
      and g.is_active
  ),
  ranked as (
    select
      o.*,
      count(*) over () as total
    from ordered o
  ),
  current_row as (
    select *
    from ranked
    where id = p_photo_id
    limit 1
  ),
  prev_row as (
    select r.slug
    from ranked r
    join current_row c
      on r.rn = case when c.rn = 1 then c.total else c.rn - 1 end
  ),
  next_row as (
    select r.slug
    from ranked r
    join current_row c
      on r.rn = case when c.rn = c.total then 1 else c.rn + 1 end
  )
  select
    (select slug from prev_row),
    (select slug from next_row);
$$;

create or replace function public.gallery_photo_neighbors(p_photo_id uuid)
returns table (
  prev_slug text,
  next_slug text
)
language sql
security invoker
set search_path = public
as $$
  select *
  from public.all_photo_neighbors(p_photo_id);
$$;

commit;
