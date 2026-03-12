begin;

do $$
begin
  if not exists (
    select 1
    from pg_type
    where typname = 'detail_view_mode'
  ) then
    create type public.detail_view_mode as enum ('classic', 'contact_sheet');
  end if;
end
$$;

alter table public.site_settings
  add column if not exists detail_view_mode public.detail_view_mode not null default 'classic',
  add column if not exists contact_sheet_perspective_px integer not null default 1200,
  add column if not exists contact_sheet_rotate_x_deg numeric(6, 2) not null default 8,
  add column if not exists contact_sheet_rotate_y_deg numeric(6, 2) not null default 10,
  add column if not exists contact_sheet_travel_z_px integer not null default 96,
  add column if not exists contact_sheet_target_fill_pct numeric(6, 4) not null default 0.38,
  add column if not exists contact_sheet_mobile_intensity_pct integer not null default 55;

alter table public.gallery_settings
  add column if not exists detail_view_mode public.detail_view_mode not null default 'classic',
  add column if not exists contact_sheet_perspective_px integer not null default 1200,
  add column if not exists contact_sheet_rotate_x_deg numeric(6, 2) not null default 8,
  add column if not exists contact_sheet_rotate_y_deg numeric(6, 2) not null default 10,
  add column if not exists contact_sheet_travel_z_px integer not null default 96,
  add column if not exists contact_sheet_target_fill_pct numeric(6, 4) not null default 0.38,
  add column if not exists contact_sheet_mobile_intensity_pct integer not null default 55;

update public.site_settings
set
  detail_view_mode = coalesce(detail_view_mode, 'classic'::public.detail_view_mode),
  contact_sheet_perspective_px = greatest(200, coalesce(contact_sheet_perspective_px, 1200)),
  contact_sheet_rotate_x_deg = greatest(0, coalesce(contact_sheet_rotate_x_deg, 8)),
  contact_sheet_rotate_y_deg = greatest(0, coalesce(contact_sheet_rotate_y_deg, 10)),
  contact_sheet_travel_z_px = greatest(0, coalesce(contact_sheet_travel_z_px, 96)),
  contact_sheet_target_fill_pct = least(0.95, greatest(0.1, coalesce(contact_sheet_target_fill_pct, 0.38))),
  contact_sheet_mobile_intensity_pct = least(100, greatest(0, coalesce(contact_sheet_mobile_intensity_pct, 55)))
where singleton_id = 1;

update public.gallery_settings
set
  detail_view_mode = coalesce(detail_view_mode, 'classic'::public.detail_view_mode),
  contact_sheet_perspective_px = greatest(200, coalesce(contact_sheet_perspective_px, 1200)),
  contact_sheet_rotate_x_deg = greatest(0, coalesce(contact_sheet_rotate_x_deg, 8)),
  contact_sheet_rotate_y_deg = greatest(0, coalesce(contact_sheet_rotate_y_deg, 10)),
  contact_sheet_travel_z_px = greatest(0, coalesce(contact_sheet_travel_z_px, 96)),
  contact_sheet_target_fill_pct = least(0.95, greatest(0.1, coalesce(contact_sheet_target_fill_pct, 0.38))),
  contact_sheet_mobile_intensity_pct = least(100, greatest(0, coalesce(contact_sheet_mobile_intensity_pct, 55)));

commit;
