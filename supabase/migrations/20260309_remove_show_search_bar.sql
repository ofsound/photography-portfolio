begin;

alter table public.gallery_settings
  drop column if exists show_search_bar;

alter table public.site_settings
  drop column if exists show_search_bar;

commit;
