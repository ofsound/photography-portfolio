begin;

alter table public.site_settings
  add column if not exists site_theme_default public.theme_mode not null default 'system',
  add column if not exists gallery_theme_default_is_overridden boolean not null default false;

update public.site_settings
set site_theme_default = coalesce(site_theme_default, theme_default)
where singleton_id = 1;

commit;
