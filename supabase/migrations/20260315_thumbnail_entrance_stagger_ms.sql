begin;

alter table public.gallery_settings
  add column if not exists thumbnail_entrance_stagger_ms integer not null default 40;

alter table public.site_settings
  add column if not exists thumbnail_entrance_stagger_ms integer not null default 40;

commit;
