alter table public.site_settings
  add column if not exists homepage_zoom_strength_pct integer not null default 5
    check (homepage_zoom_strength_pct between 0 and 20),
  add column if not exists homepage_pan_strength_pct integer not null default 80
    check (homepage_pan_strength_pct between 0 and 100);
