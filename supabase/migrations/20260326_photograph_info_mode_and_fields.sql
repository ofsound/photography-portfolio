begin;

do $$
begin
  if not exists (
    select 1
    from pg_type
    where typname = 'photograph_info_mode'
      and typnamespace = 'public'::regnamespace
  ) then
    create type public.photograph_info_mode as enum (
      'hidden',
      'floating',
      'bottom_dock'
    );
  end if;
end
$$;

alter table public.site_settings
  add column if not exists photograph_info_mode public.photograph_info_mode not null default 'floating',
  add column if not exists show_photo_info_title boolean not null default true,
  add column if not exists show_photo_info_description boolean not null default true,
  add column if not exists show_photo_info_capture_date boolean not null default false,
  add column if not exists show_photo_info_dimensions boolean not null default false,
  add column if not exists show_photo_info_license_text boolean not null default false;

alter table public.gallery_settings
  add column if not exists photograph_info_mode public.photograph_info_mode not null default 'floating',
  add column if not exists show_photo_info_title boolean not null default true,
  add column if not exists show_photo_info_description boolean not null default true,
  add column if not exists show_photo_info_capture_date boolean not null default false,
  add column if not exists show_photo_info_dimensions boolean not null default false,
  add column if not exists show_photo_info_license_text boolean not null default false;

update public.site_settings
set
  photograph_info_mode = case
    when show_photograph_info then 'floating'::public.photograph_info_mode
    else 'hidden'::public.photograph_info_mode
  end,
  show_photo_info_title = true,
  show_photo_info_description = true,
  show_photo_info_capture_date = false,
  show_photo_info_dimensions = false,
  show_photo_info_license_text = false
where singleton_id = 1;

update public.gallery_settings
set
  photograph_info_mode = case
    when show_photograph_info then 'floating'::public.photograph_info_mode
    else 'hidden'::public.photograph_info_mode
  end,
  show_photo_info_title = true,
  show_photo_info_description = true,
  show_photo_info_capture_date = false,
  show_photo_info_dimensions = false,
  show_photo_info_license_text = false;

commit;
