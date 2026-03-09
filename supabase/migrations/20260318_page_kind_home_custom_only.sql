-- Simplify page_kind: about and contact are now regular custom pages.
-- 1) Migrate existing about/contact pages to custom
-- 2) Shrink enum to home | custom
-- 3) Update unique constraint to home-only
-- 4) Remove about/contact from gallery reserved slugs
-- 5) Simplify page slug validation (no about/contact exception)

begin;

-- Migrate existing pages
update public.pages
set kind = 'custom'
where kind in ('about', 'contact');

-- Drop old unique index (covers home, about, contact)
drop index if exists public.pages_single_system_kind_idx;

-- Drop trigger that depends on kind column
drop trigger if exists pages_validate_root_slug on public.pages;

-- Create new enum and migrate column
create type public.page_kind_new as enum ('home', 'custom');

alter table public.pages
  alter column kind type public.page_kind_new
  using (kind::text::public.page_kind_new);

drop type public.page_kind;
alter type public.page_kind_new rename to page_kind;

-- Recreate unique constraint: only one home page
create unique index pages_single_home_idx
  on public.pages (kind)
  where kind = 'home' and deleted_at is null;

-- Update gallery slug validation: remove about, contact from reserved list
create or replace function public.tg_validate_gallery_root_slug()
returns trigger
language plpgsql
as $$
declare
  normalized_slug text;
begin
  normalized_slug := lower(trim(new.slug));
  if normalized_slug = '' then
    raise exception 'Gallery slug is required.';
  end if;

  if normalized_slug in ('admin', 'all', 'photo', 'search', 'auth', 'api') then
    raise exception 'Gallery slug "%" is reserved.', normalized_slug;
  end if;

  if exists (
    select 1
    from public.pages p
    where p.deleted_at is null
      and lower(p.slug) = normalized_slug
  ) then
    raise exception 'Gallery slug "%" conflicts with an active page slug.', normalized_slug;
  end if;

  new.slug := normalized_slug;
  return new;
end;
$$;

-- Update page slug validation: remove about/contact exception
create or replace function public.tg_validate_page_root_slug()
returns trigger
language plpgsql
as $$
declare
  normalized_slug text;
begin
  normalized_slug := lower(trim(new.slug));
  if normalized_slug = '' then
    raise exception 'Page slug is required.';
  end if;

  if new.deleted_at is null
     and normalized_slug in ('admin', 'all', 'gallery', 'photo', 'search', 'auth', 'api') then
    raise exception 'Page slug "%" is reserved.', normalized_slug;
  end if;

  if new.deleted_at is null and exists (
    select 1
    from public.galleries g
    where lower(g.slug) = normalized_slug
  ) then
    raise exception 'Page slug "%" conflicts with an existing gallery slug.', normalized_slug;
  end if;

  new.slug := normalized_slug;
  return new;
end;
$$;

-- Recreate trigger
create trigger pages_validate_root_slug
before insert or update of slug, kind, deleted_at on public.pages
for each row execute function public.tg_validate_page_root_slug();

commit;
