alter table public.site_settings
  add column if not exists show_search_link_in_nav boolean not null default true;
