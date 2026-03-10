begin;

alter table public.galleries
  add column if not exists og_title text,
  add column if not exists og_description text,
  add column if not exists og_image_path text;

alter table public.pages
  add column if not exists og_title text,
  add column if not exists og_description text;

alter table public.photos
  add column if not exists seo_title text,
  add column if not exists seo_description text;

update public.galleries
set
  og_title = coalesce(og_title, seo_title),
  og_description = coalesce(og_description, seo_description)
where
  og_title is null
  or og_description is null;

update public.pages
set
  og_title = coalesce(og_title, seo_title),
  og_description = coalesce(og_description, seo_description)
where
  og_title is null
  or og_description is null;

update public.photos
set
  seo_title = coalesce(seo_title, og_title),
  seo_description = coalesce(seo_description, og_description)
where
  seo_title is null
  or seo_description is null;

commit;
