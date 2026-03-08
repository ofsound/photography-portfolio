begin;

create type public.gallery_visibility_status as enum (
  'public',
  'unlisted',
  'archived'
);

alter table public.galleries
  add column visibility_status public.gallery_visibility_status;

update public.galleries
set visibility_status = case
  when is_active and show_in_nav then 'public'::public.gallery_visibility_status
  when is_active then 'unlisted'::public.gallery_visibility_status
  else 'archived'::public.gallery_visibility_status
end
where visibility_status is null;

alter table public.galleries
  alter column visibility_status set default 'public',
  alter column visibility_status set not null;

drop index if exists public.galleries_nav_idx;
create index galleries_visibility_nav_idx
  on public.galleries (visibility_status, nav_order, name);

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
      and g.visibility_status = 'public'
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

drop policy if exists galleries_public_read on public.galleries;
create policy galleries_public_read
on public.galleries
for select
using (public.cms_can_edit() or visibility_status <> 'archived');

drop policy if exists gallery_settings_public_read on public.gallery_settings;
create policy gallery_settings_public_read
on public.gallery_settings
for select
using (
  public.cms_can_edit()
  or scope = 'all'
  or exists (
    select 1
    from public.galleries g
    where g.id = gallery_settings.gallery_id
      and g.visibility_status <> 'archived'
  )
);

drop policy if exists gallery_slug_history_public_read on public.gallery_slug_history;
create policy gallery_slug_history_public_read
on public.gallery_slug_history
for select
using (
  public.cms_can_edit()
  or exists (
    select 1
    from public.galleries g
    where g.id = gallery_slug_history.gallery_id
      and g.visibility_status <> 'archived'
  )
);

drop policy if exists photo_slug_history_public_read on public.photo_slug_history;
create policy photo_slug_history_public_read
on public.photo_slug_history
for select
using (
  public.cms_can_edit()
  or exists (
    select 1
    from public.photos p
    join public.galleries g on g.id = p.gallery_id
    where p.id = photo_slug_history.photo_id
      and p.status = 'published'
      and p.deleted_at is null
      and g.visibility_status <> 'archived'
  )
);

drop policy if exists photos_public_read on public.photos;
create policy photos_public_read
on public.photos
for select
using (
  status = 'published'
  and deleted_at is null
  and exists (
    select 1
    from public.galleries g
    where g.id = photos.gallery_id
      and g.visibility_status <> 'archived'
  )
);

drop policy if exists photo_images_public_read on public.photo_images;
create policy photo_images_public_read
on public.photo_images
for select
using (
  is_active
  and delivery_storage_path is not null
  and exists (
    select 1
    from public.photos p
    join public.galleries g on g.id = p.gallery_id
    where p.id = photo_images.photo_id
      and p.status = 'published'
      and p.deleted_at is null
      and g.visibility_status <> 'archived'
  )
);

drop policy if exists photo_categories_public_read on public.photo_categories;
create policy photo_categories_public_read
on public.photo_categories
for select
using (
  exists (
    select 1
    from public.photos p
    join public.galleries g on g.id = p.gallery_id
    where p.id = photo_categories.photo_id
      and p.status = 'published'
      and p.deleted_at is null
      and g.visibility_status <> 'archived'
  )
);

drop policy if exists photo_tags_public_read on public.photo_tags;
create policy photo_tags_public_read
on public.photo_tags
for select
using (
  exists (
    select 1
    from public.photos p
    join public.galleries g on g.id = p.gallery_id
    where p.id = photo_tags.photo_id
      and p.status = 'published'
      and p.deleted_at is null
      and g.visibility_status <> 'archived'
  )
);

drop policy if exists homepage_slides_public_read on public.homepage_slides;
create policy homepage_slides_public_read
on public.homepage_slides
for select
using (
  is_active
  and exists (
    select 1
    from public.photo_images pi
    join public.photos p on p.id = pi.photo_id
    join public.galleries g on g.id = p.gallery_id
    where pi.id = homepage_slides.photo_image_id
      and pi.is_active
      and p.status = 'published'
      and p.deleted_at is null
      and g.visibility_status <> 'archived'
  )
);

alter table public.galleries
  drop column is_active,
  drop column show_in_nav;

commit;
