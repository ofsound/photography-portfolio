-- Add 'show_thumbnail_zoom_hover' to the site_settings table
alter table public.site_settings add column show_thumbnail_zoom_hover boolean not null default true;
