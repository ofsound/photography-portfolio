begin;

-- Final hardening pass:
-- 1) enforce root namespace invariants for active pages and galleries
-- 2) add DB-level slug guards for future writes
-- 3) remove compatibility RPCs no longer used by the app

do $$
declare
  conflict_slug text;
begin
  -- Active pages cannot claim reserved non-system slugs.
  select p.slug
  into conflict_slug
  from public.pages p
  where p.deleted_at is null
    and p.slug in ('admin', 'all', 'gallery', 'photo', 'search', 'auth', 'api')
  limit 1;

  if conflict_slug is not null then
    raise exception
      'Namespace invariant failed: active page slug "%" is reserved.',
      conflict_slug;
  end if;

  -- Galleries cannot claim reserved system slugs, except "gallery" by design.
  select g.slug
  into conflict_slug
  from public.galleries g
  where g.slug in ('admin', 'all', 'photo', 'about', 'contact', 'search', 'auth', 'api')
  limit 1;

  if conflict_slug is not null then
    raise exception
      'Namespace invariant failed: gallery slug "%" is reserved.',
      conflict_slug;
  end if;

  -- Active pages and galleries must not share the same root slug.
  select p.slug
  into conflict_slug
  from public.pages p
  join public.galleries g
    on lower(g.slug) = lower(p.slug)
  where p.deleted_at is null
  limit 1;

  if conflict_slug is not null then
    raise exception
      'Namespace invariant failed: page/gallery slug collision at "%".',
      conflict_slug;
  end if;
end
$$;

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

  if normalized_slug in ('admin', 'all', 'photo', 'about', 'contact', 'search', 'auth', 'api') then
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

drop trigger if exists galleries_validate_root_slug on public.galleries;
create trigger galleries_validate_root_slug
before insert or update of slug on public.galleries
for each row execute function public.tg_validate_gallery_root_slug();

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
     and coalesce(new.kind::text, '') not in ('about', 'contact')
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

drop trigger if exists pages_validate_root_slug on public.pages;
create trigger pages_validate_root_slug
before insert or update of slug, kind, deleted_at on public.pages
for each row execute function public.tg_validate_page_root_slug();

drop function if exists public.reorder_photos(uuid[]);
drop function if exists public.gallery_photo_neighbors(uuid);

commit;
