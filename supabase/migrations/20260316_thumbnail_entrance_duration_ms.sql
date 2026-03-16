begin;

alter table public.gallery_settings
  add column if not exists thumbnail_entrance_duration_ms integer not null default 520;

alter table public.site_settings
  add column if not exists thumbnail_entrance_duration_ms integer not null default 520;

commit;
