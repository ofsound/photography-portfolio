begin;

alter table public.pages
  add column if not exists bg_image_fixed boolean not null default false;

commit;
