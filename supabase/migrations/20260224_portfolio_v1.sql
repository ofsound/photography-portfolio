begin;

create extension if not exists pgcrypto;
create extension if not exists pg_trgm;
create extension if not exists unaccent;

create type public.app_role as enum ('admin', 'editor');
create type public.theme_mode as enum ('light', 'dark', 'system');
create type public.layout_mode as enum ('uniform', 'masonry');
create type public.transition_preset as enum ('cinematic', 'snappy', 'experimental');
create type public.page_kind as enum ('home', 'about', 'contact', 'custom');
create type public.publish_status as enum ('published', 'archived');
create type public.asset_kind as enum ('lead', 'additional');

create table public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  role public.app_role not null default 'editor',
  display_name text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create or replace function public.cms_is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.user_id = auth.uid()
      and p.role = 'admin'
  );
$$;

create or replace function public.cms_can_edit()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.user_id = auth.uid()
      and p.role in ('admin', 'editor')
  );
$$;

create table public.site_settings (
  singleton_id smallint primary key default 1 check (singleton_id = 1),
  theme_default public.theme_mode not null default 'system',
  grid_desktop_default integer not null default 6 check (grid_desktop_default between 1 and 30),
  grid_mobile_default integer not null default 3 check (grid_mobile_default between 1 and 8),
  grid_desktop_max integer not null default 20 check (grid_desktop_max between 1 and 30),
  grid_mobile_max integer not null default 6 check (grid_mobile_max between 1 and 8),
  max_content_width_px integer check (max_content_width_px is null or max_content_width_px > 0),
  gallery_layout_mode public.layout_mode not null default 'uniform',
  uniform_thumb_ratio numeric(5, 3) not null default 1.000 check (uniform_thumb_ratio > 0 and uniform_thumb_ratio <= 3),
  transition_preset public.transition_preset not null default 'cinematic',
  allow_transition_toggle boolean not null default true,
  updated_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  check (grid_desktop_max >= grid_desktop_default),
  check (grid_mobile_max >= grid_mobile_default)
);

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_by uuid references auth.users (id) on delete set null,
  updated_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create unique index categories_name_ci_unique on public.categories (lower(name));
create index categories_active_sort_idx on public.categories (is_active, sort_order, name);

create table public.tags (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text,
  is_active boolean not null default true,
  created_by uuid references auth.users (id) on delete set null,
  updated_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create unique index tags_name_ci_unique on public.tags (lower(name));
create index tags_active_name_idx on public.tags (is_active, name);
create index tags_name_trgm_idx on public.tags using gin (name gin_trgm_ops);

create table public.photos (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  capture_date date,
  description text,
  width_px integer check (width_px is null or width_px > 0),
  height_px integer check (height_px is null or height_px > 0),
  license_text text,
  og_title text,
  og_description text,
  og_image_path text,
  status public.publish_status not null default 'published',
  is_searchable boolean not null default true,
  deleted_at timestamptz,
  search_document text not null default '',
  search_tsv tsvector not null default ''::tsvector,
  created_by uuid references auth.users (id) on delete set null,
  updated_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index photos_public_idx on public.photos (status, deleted_at, capture_date desc, created_at desc);
create index photos_search_tsv_idx on public.photos using gin (search_tsv);

create table public.photo_images (
  id uuid primary key default gen_random_uuid(),
  photo_id uuid not null references public.photos (id) on delete cascade,
  source_storage_path text not null unique,
  source_mime_type text not null check (source_mime_type in ('image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif')),
  source_bytes bigint not null check (source_bytes > 0 and source_bytes <= 20971520),
  delivery_storage_path text unique,
  delivery_mime_type text check (delivery_mime_type is null or delivery_mime_type in ('image/jpeg', 'image/png', 'image/webp')),
  delivery_bytes bigint check (delivery_bytes is null or delivery_bytes > 0),
  width_px integer check (width_px is null or width_px > 0),
  height_px integer check (height_px is null or height_px > 0),
  focal_x numeric(4, 3) not null default 0.500 check (focal_x between 0 and 1),
  focal_y numeric(4, 3) not null default 0.500 check (focal_y between 0 and 1),
  alt_text text,
  kind public.asset_kind not null,
  position integer not null default 0 check (position >= 0),
  exif jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  created_by uuid references auth.users (id) on delete set null,
  updated_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  check (
    source_mime_type not in ('image/heic', 'image/heif')
    or delivery_mime_type in ('image/jpeg', 'image/webp')
  ),
  check (
    (delivery_storage_path is null and delivery_mime_type is null and delivery_bytes is null)
    or (delivery_storage_path is not null and delivery_mime_type is not null)
  ),
  unique (photo_id, position)
);

create unique index photo_images_single_lead_per_photo
  on public.photo_images (photo_id)
  where kind = 'lead';
create index photo_images_photo_kind_position_idx on public.photo_images (photo_id, kind, position);

create table public.photo_categories (
  photo_id uuid not null references public.photos (id) on delete cascade,
  category_id uuid not null references public.categories (id) on delete restrict,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  primary key (photo_id, category_id)
);

create table public.photo_tags (
  photo_id uuid not null references public.photos (id) on delete cascade,
  tag_id uuid not null references public.tags (id) on delete restrict,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  primary key (photo_id, tag_id)
);

create table public.homepage_slides (
  id uuid primary key default gen_random_uuid(),
  photo_image_id uuid not null references public.photo_images (id) on delete cascade,
  position integer not null unique check (position >= 0),
  caption_override text,
  is_active boolean not null default true,
  created_by uuid references auth.users (id) on delete set null,
  updated_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index homepage_slides_active_position_idx on public.homepage_slides (is_active, position);

create table public.pages (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  kind public.page_kind not null,
  html_content text not null default '',
  css_module text not null default '',
  seo_title text,
  seo_description text,
  og_image_path text,
  status public.publish_status not null default 'published',
  show_in_nav boolean not null default false,
  nav_order integer not null default 0,
  deleted_at timestamptz,
  created_by uuid references auth.users (id) on delete set null,
  updated_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create unique index pages_single_system_kind_idx
  on public.pages (kind)
  where kind in ('home', 'about', 'contact') and deleted_at is null;
create index pages_public_idx on public.pages (status, deleted_at, kind, nav_order, slug);

create table public.content_revisions (
  id bigint generated always as identity primary key,
  entity_type text not null,
  entity_pk text not null,
  version_no integer not null check (version_no > 0),
  snapshot jsonb not null,
  changed_by uuid references auth.users (id) on delete set null,
  changed_at timestamptz not null default timezone('utc', now()),
  reason text,
  unique (entity_type, entity_pk, version_no)
);

create index content_revisions_lookup_idx on public.content_revisions (entity_type, entity_pk, changed_at desc);

create table public.audit_log (
  id bigint generated always as identity primary key,
  actor_user_id uuid references auth.users (id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_pk text not null,
  changes jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create index audit_log_lookup_idx on public.audit_log (entity_type, entity_pk, created_at desc);

create or replace function public.tg_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := timezone('utc', now());
  return new;
end;
$$;

create or replace function public.tg_set_actor_fields()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'INSERT' and new.created_by is null then
    new.created_by := auth.uid();
  end if;
  new.updated_by := auth.uid();
  return new;
end;
$$;

create or replace function public.tg_set_site_settings_actor()
returns trigger
language plpgsql
as $$
begin
  new.updated_by := auth.uid();
  return new;
end;
$$;

create or replace function public.tg_site_settings_restrict_sensitive_fields()
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

create or replace function public.refresh_photo_search(p_photo_id uuid)
returns void
language plpgsql
as $$
declare
  v_title text;
  v_description text;
  v_tags text;
  v_categories text;
  v_doc text;
begin
  select p.title, coalesce(p.description, '')
  into v_title, v_description
  from public.photos p
  where p.id = p_photo_id;

  if not found then
    return;
  end if;

  select coalesce(string_agg(distinct t.name, ' '), '')
  into v_tags
  from public.photo_tags pt
  join public.tags t on t.id = pt.tag_id
  where pt.photo_id = p_photo_id
    and t.is_active;

  select coalesce(string_agg(distinct c.name, ' '), '')
  into v_categories
  from public.photo_categories pc
  join public.categories c on c.id = pc.category_id
  where pc.photo_id = p_photo_id
    and c.is_active;

  v_doc := trim(concat_ws(' ', v_title, v_description, v_tags, v_categories));

  update public.photos p
  set search_document = v_doc,
      search_tsv = to_tsvector('simple', unaccent(v_doc))
  where p.id = p_photo_id;
end;
$$;

create or replace function public.tg_refresh_photo_search_from_photo()
returns trigger
language plpgsql
as $$
begin
  perform public.refresh_photo_search(new.id);
  return new;
end;
$$;

create or replace function public.tg_refresh_photo_search_from_link()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'DELETE' then
    perform public.refresh_photo_search(old.photo_id);
    return old;
  end if;
  perform public.refresh_photo_search(new.photo_id);
  return new;
end;
$$;

create or replace function public.tg_refresh_photo_search_from_tag_update()
returns trigger
language plpgsql
as $$
declare
  r record;
begin
  for r in
    select pt.photo_id
    from public.photo_tags pt
    where pt.tag_id = new.id
  loop
    perform public.refresh_photo_search(r.photo_id);
  end loop;
  return new;
end;
$$;

create or replace function public.tg_refresh_photo_search_from_category_update()
returns trigger
language plpgsql
as $$
declare
  r record;
begin
  for r in
    select pc.photo_id
    from public.photo_categories pc
    where pc.category_id = new.id
  loop
    perform public.refresh_photo_search(r.photo_id);
  end loop;
  return new;
end;
$$;

create or replace function public.tg_append_revision()
returns trigger
language plpgsql
as $$
declare
  v_entity_type text := tg_argv[0];
  v_pk_column text := tg_argv[1];
  v_pk text;
  v_snapshot jsonb;
  v_next_version integer;
begin
  if tg_op = 'DELETE' then
    v_snapshot := to_jsonb(old);
  else
    v_snapshot := to_jsonb(new);
  end if;

  v_pk := v_snapshot ->> v_pk_column;
  if v_pk is null then
    raise exception 'Revision trigger missing pk column % for entity %', v_pk_column, v_entity_type;
  end if;

  select coalesce(max(version_no) + 1, 1)
  into v_next_version
  from public.content_revisions
  where entity_type = v_entity_type
    and entity_pk = v_pk;

  insert into public.content_revisions (entity_type, entity_pk, version_no, snapshot, changed_by)
  values (v_entity_type, v_pk, v_next_version, v_snapshot, auth.uid());

  return coalesce(new, old);
end;
$$;

create or replace function public.tg_audit_log()
returns trigger
language plpgsql
as $$
declare
  v_entity_type text := tg_argv[0];
  v_pk_column text := tg_argv[1];
  v_pk text;
  v_old jsonb := '{}'::jsonb;
  v_new jsonb := '{}'::jsonb;
begin
  if tg_op = 'DELETE' then
    v_old := to_jsonb(old);
    v_pk := v_old ->> v_pk_column;
  elsif tg_op = 'UPDATE' then
    v_old := to_jsonb(old);
    v_new := to_jsonb(new);
    v_pk := v_new ->> v_pk_column;
  else
    v_new := to_jsonb(new);
    v_pk := v_new ->> v_pk_column;
  end if;

  insert into public.audit_log (actor_user_id, action, entity_type, entity_pk, changes)
  values (
    auth.uid(),
    lower(tg_op),
    v_entity_type,
    coalesce(v_pk, 'unknown'),
    jsonb_build_object('old', v_old, 'new', v_new)
  );

  return coalesce(new, old);
end;
$$;

create or replace function public.tg_prevent_mutation()
returns trigger
language plpgsql
as $$
begin
  raise exception 'This table is append-only.';
end;
$$;

create trigger profiles_set_updated_at before update on public.profiles
for each row execute function public.tg_set_updated_at();

create trigger site_settings_set_updated_at before update on public.site_settings
for each row execute function public.tg_set_updated_at();
create trigger site_settings_set_actor before insert or update on public.site_settings
for each row execute function public.tg_set_site_settings_actor();
create trigger site_settings_restrict_sensitive_fields before update on public.site_settings
for each row execute function public.tg_site_settings_restrict_sensitive_fields();

create trigger categories_set_updated_at before update on public.categories
for each row execute function public.tg_set_updated_at();
create trigger categories_set_actor before insert or update on public.categories
for each row execute function public.tg_set_actor_fields();

create trigger tags_set_updated_at before update on public.tags
for each row execute function public.tg_set_updated_at();
create trigger tags_set_actor before insert or update on public.tags
for each row execute function public.tg_set_actor_fields();

create trigger photos_set_updated_at before update on public.photos
for each row execute function public.tg_set_updated_at();
create trigger photos_set_actor before insert or update on public.photos
for each row execute function public.tg_set_actor_fields();

create trigger photo_images_set_updated_at before update on public.photo_images
for each row execute function public.tg_set_updated_at();
create trigger photo_images_set_actor before insert or update on public.photo_images
for each row execute function public.tg_set_actor_fields();

create trigger homepage_slides_set_updated_at before update on public.homepage_slides
for each row execute function public.tg_set_updated_at();
create trigger homepage_slides_set_actor before insert or update on public.homepage_slides
for each row execute function public.tg_set_actor_fields();

create trigger pages_set_updated_at before update on public.pages
for each row execute function public.tg_set_updated_at();
create trigger pages_set_actor before insert or update on public.pages
for each row execute function public.tg_set_actor_fields();

create trigger photos_refresh_search_after_change
after insert or update of title, description on public.photos
for each row execute function public.tg_refresh_photo_search_from_photo();

create trigger photo_tags_refresh_search_after_change
after insert or delete on public.photo_tags
for each row execute function public.tg_refresh_photo_search_from_link();

create trigger photo_categories_refresh_search_after_change
after insert or delete on public.photo_categories
for each row execute function public.tg_refresh_photo_search_from_link();

create trigger tags_refresh_search_after_update
after update of name, is_active on public.tags
for each row execute function public.tg_refresh_photo_search_from_tag_update();

create trigger categories_refresh_search_after_update
after update of name, is_active on public.categories
for each row execute function public.tg_refresh_photo_search_from_category_update();

create trigger pages_append_revision
after insert or update or delete on public.pages
for each row execute function public.tg_append_revision('page', 'id');

create trigger site_settings_append_revision
after update on public.site_settings
for each row execute function public.tg_append_revision('site_settings', 'singleton_id');

create trigger categories_audit after insert or update or delete on public.categories
for each row execute function public.tg_audit_log('category', 'id');
create trigger tags_audit after insert or update or delete on public.tags
for each row execute function public.tg_audit_log('tag', 'id');
create trigger photos_audit after insert or update or delete on public.photos
for each row execute function public.tg_audit_log('photo', 'id');
create trigger photo_images_audit after insert or update or delete on public.photo_images
for each row execute function public.tg_audit_log('photo_image', 'id');
create trigger photo_categories_audit after insert or update or delete on public.photo_categories
for each row execute function public.tg_audit_log('photo_category', 'photo_id');
create trigger photo_tags_audit after insert or update or delete on public.photo_tags
for each row execute function public.tg_audit_log('photo_tag', 'photo_id');
create trigger homepage_slides_audit after insert or update or delete on public.homepage_slides
for each row execute function public.tg_audit_log('homepage_slide', 'id');
create trigger pages_audit after insert or update or delete on public.pages
for each row execute function public.tg_audit_log('page', 'id');
create trigger site_settings_audit after update on public.site_settings
for each row execute function public.tg_audit_log('site_settings', 'singleton_id');
create trigger profiles_audit after update on public.profiles
for each row execute function public.tg_audit_log('profile', 'user_id');

create trigger content_revisions_no_update
before update or delete on public.content_revisions
for each row execute function public.tg_prevent_mutation();

create trigger audit_log_no_update
before update or delete on public.audit_log
for each row execute function public.tg_prevent_mutation();

alter table public.profiles enable row level security;
alter table public.site_settings enable row level security;
alter table public.categories enable row level security;
alter table public.tags enable row level security;
alter table public.photos enable row level security;
alter table public.photo_images enable row level security;
alter table public.photo_categories enable row level security;
alter table public.photo_tags enable row level security;
alter table public.homepage_slides enable row level security;
alter table public.pages enable row level security;
alter table public.content_revisions enable row level security;
alter table public.audit_log enable row level security;

create policy profiles_select_self_or_admin
on public.profiles
for select
using (user_id = auth.uid() or public.cms_is_admin());

create policy profiles_admin_write
on public.profiles
for all
using (public.cms_is_admin())
with check (public.cms_is_admin());

create policy site_settings_public_read
on public.site_settings
for select
using (true);

create policy site_settings_editor_write
on public.site_settings
for all
using (public.cms_can_edit())
with check (public.cms_can_edit());

create policy categories_public_read
on public.categories
for select
using (is_active);

create policy categories_editor_write
on public.categories
for all
using (public.cms_can_edit())
with check (public.cms_can_edit());

create policy tags_public_read
on public.tags
for select
using (is_active);

create policy tags_editor_write
on public.tags
for all
using (public.cms_can_edit())
with check (public.cms_can_edit());

create policy photos_public_read
on public.photos
for select
using (status = 'published' and deleted_at is null);

create policy photos_editor_write
on public.photos
for all
using (public.cms_can_edit())
with check (public.cms_can_edit());

create policy photo_images_public_read
on public.photo_images
for select
using (
  is_active
  and delivery_storage_path is not null
  and exists (
    select 1
    from public.photos p
    where p.id = photo_images.photo_id
      and p.status = 'published'
      and p.deleted_at is null
  )
);

create policy photo_images_editor_write
on public.photo_images
for all
using (public.cms_can_edit())
with check (public.cms_can_edit());

create policy photo_categories_public_read
on public.photo_categories
for select
using (
  exists (
    select 1
    from public.photos p
    where p.id = photo_categories.photo_id
      and p.status = 'published'
      and p.deleted_at is null
  )
);

create policy photo_categories_editor_write
on public.photo_categories
for all
using (public.cms_can_edit())
with check (public.cms_can_edit());

create policy photo_tags_public_read
on public.photo_tags
for select
using (
  exists (
    select 1
    from public.photos p
    where p.id = photo_tags.photo_id
      and p.status = 'published'
      and p.deleted_at is null
  )
);

create policy photo_tags_editor_write
on public.photo_tags
for all
using (public.cms_can_edit())
with check (public.cms_can_edit());

create policy homepage_slides_public_read
on public.homepage_slides
for select
using (
  is_active
  and exists (
    select 1
    from public.photo_images pi
    join public.photos p on p.id = pi.photo_id
    where pi.id = homepage_slides.photo_image_id
      and pi.is_active
      and p.status = 'published'
      and p.deleted_at is null
  )
);

create policy homepage_slides_editor_write
on public.homepage_slides
for all
using (public.cms_can_edit())
with check (public.cms_can_edit());

create policy pages_public_read
on public.pages
for select
using (status = 'published' and deleted_at is null);

create policy pages_editor_write
on public.pages
for all
using (public.cms_can_edit())
with check (public.cms_can_edit());

create policy content_revisions_cms_read
on public.content_revisions
for select
using (public.cms_can_edit());

create policy content_revisions_cms_insert
on public.content_revisions
for insert
with check (public.cms_can_edit());

create policy audit_log_cms_read
on public.audit_log
for select
using (public.cms_can_edit());

create policy audit_log_cms_insert
on public.audit_log
for insert
with check (public.cms_can_edit());

insert into public.site_settings (singleton_id)
values (1)
on conflict (singleton_id) do nothing;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'photos',
  'photos',
  true,
  20971520,
  array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "Public can read photos bucket"
on storage.objects
for select
using (bucket_id = 'photos');

create policy "CMS can write photos bucket"
on storage.objects
for all
to authenticated
using (bucket_id = 'photos' and public.cms_can_edit())
with check (bucket_id = 'photos' and public.cms_can_edit());

commit;
