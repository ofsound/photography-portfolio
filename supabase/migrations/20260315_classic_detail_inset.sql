-- Classic detail view letterbox inset (horizontal / vertical) and vertical placement.
-- Percentage-based (0–50) padding that shrinks the promoted image in classic mode.
-- Vertical position (0–100, default 50) controls where the image sits within the inset area.

alter table public.gallery_settings
  add column
if not exists classic_detail_h_inset_pct numeric
(4, 1)
    not null default 0
    check
(classic_detail_h_inset_pct >= 0 and classic_detail_h_inset_pct <= 50);

alter table public.gallery_settings
  add column
if not exists classic_detail_v_inset_pct numeric
(4, 1)
    not null default 0
    check
(classic_detail_v_inset_pct >= 0 and classic_detail_v_inset_pct <= 50);

alter table public.site_settings
  add column
if not exists classic_detail_h_inset_pct numeric
(4, 1)
    not null default 0
    check
(classic_detail_h_inset_pct >= 0 and classic_detail_h_inset_pct <= 50);

alter table public.site_settings
  add column
if not exists classic_detail_v_inset_pct numeric
(4, 1)
    not null default 0
    check
(classic_detail_v_inset_pct >= 0 and classic_detail_v_inset_pct <= 50);

alter table public.gallery_settings
  add column
if not exists classic_detail_v_position_pct numeric
(4, 1)
    not null default 50
    check
(classic_detail_v_position_pct >= 0 and classic_detail_v_position_pct <= 100);

alter table public.site_settings
  add column
if not exists classic_detail_v_position_pct numeric
(4, 1)
    not null default 50
    check
(classic_detail_v_position_pct >= 0 and classic_detail_v_position_pct <= 100);

alter table public.gallery_settings
  add column
if not exists classic_detail_border_px integer
    not null default 0
    check
(classic_detail_border_px >= 0 and classic_detail_border_px <= 50);

alter table public.site_settings
  add column
if not exists classic_detail_border_px integer
    not null default 0
    check
(classic_detail_border_px >= 0 and classic_detail_border_px <= 50);
