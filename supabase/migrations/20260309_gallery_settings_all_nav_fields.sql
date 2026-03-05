begin;

alter table public.gallery_settings
  add column if not exists show_in_nav boolean not null default true;

alter table public.gallery_settings
  add column if not exists nav_order integer not null default 0;

commit;
