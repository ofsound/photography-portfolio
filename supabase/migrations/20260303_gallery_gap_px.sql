-- Gallery gap (px) is configured in admin settings only; no user control on the frontend.
alter table public.site_settings
  add column if not exists gallery_gap_px integer not null default 8
  check (gallery_gap_px >= 0 and gallery_gap_px <= 20);
