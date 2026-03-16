begin;

alter table public.site_settings
  add column if not exists thumbnail_promote_duration_ms integer not null default 520,
  add column if not exists thumbnail_promote_easing text not null default 'cubic-bezier(0.16, 1, 0.3, 1)',
  add column if not exists thumbnail_demote_duration_ms integer not null default 520,
  add column if not exists thumbnail_demote_easing text not null default 'cubic-bezier(0.16, 1, 0.3, 1)';

alter table public.gallery_settings
  add column if not exists thumbnail_promote_duration_ms integer,
  add column if not exists thumbnail_promote_easing text,
  add column if not exists thumbnail_demote_duration_ms integer,
  add column if not exists thumbnail_demote_easing text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'site_settings_thumbnail_promote_duration_ms_positive'
      and conrelid = 'public.site_settings'::regclass
  ) then
    alter table public.site_settings
      add constraint site_settings_thumbnail_promote_duration_ms_positive
      check (thumbnail_promote_duration_ms > 0);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'site_settings_thumbnail_demote_duration_ms_positive'
      and conrelid = 'public.site_settings'::regclass
  ) then
    alter table public.site_settings
      add constraint site_settings_thumbnail_demote_duration_ms_positive
      check (thumbnail_demote_duration_ms > 0);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'gallery_settings_thumbnail_promote_duration_ms_positive'
      and conrelid = 'public.gallery_settings'::regclass
  ) then
    alter table public.gallery_settings
      add constraint gallery_settings_thumbnail_promote_duration_ms_positive
      check (
        thumbnail_promote_duration_ms is null
        or thumbnail_promote_duration_ms > 0
      );
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'gallery_settings_thumbnail_demote_duration_ms_positive'
      and conrelid = 'public.gallery_settings'::regclass
  ) then
    alter table public.gallery_settings
      add constraint gallery_settings_thumbnail_demote_duration_ms_positive
      check (
        thumbnail_demote_duration_ms is null
        or thumbnail_demote_duration_ms > 0
      );
  end if;
end;
$$;

update public.site_settings as s
set transition_preset = g.transition_preset
from public.gallery_settings as g
where s.singleton_id = 1
  and g.scope = 'all'
  and g.transition_preset is not null;

alter table public.gallery_settings
  drop column if exists transition_preset;

create or replace function public.tg_site_settings_restrict_sensitive_fields()
returns trigger
language plpgsql
as $$
begin
  if tg_op <> 'UPDATE' then
    return new;
  end if;

  if auth.uid() is null or coalesce(auth.role(), '') = 'service_role' then
    return new;
  end if;

  if not public.cms_is_admin() then
    if new.thumbnail_entrance_preset is distinct from old.thumbnail_entrance_preset then
      raise exception 'Only admins can update thumbnail entrance preset.';
    end if;

    if new.preloader_preset is distinct from old.preloader_preset then
      raise exception 'Only admins can update preloader preset.';
    end if;

    if new.nav_button_preset is distinct from old.nav_button_preset then
      raise exception 'Only admins can update nav button preset.';
    end if;

    if new.public_font_import_url is distinct from old.public_font_import_url
      or new.public_font_family is distinct from old.public_font_family
      or new.admin_font_import_url is distinct from old.admin_font_import_url
      or new.admin_font_family is distinct from old.admin_font_family then
      raise exception 'Only admins can update typography settings.';
    end if;

    if new.brand_light_hex is distinct from old.brand_light_hex
      or new.brand_dark_hex is distinct from old.brand_dark_hex
      or new.brand_contrast_light_hex is distinct from old.brand_contrast_light_hex
      or new.brand_contrast_dark_hex is distinct from old.brand_contrast_dark_hex then
      raise exception 'Only admins can update brand color settings.';
    end if;

    if new.default_page_max_width_px is distinct from old.default_page_max_width_px then
      raise exception 'Only admins can update default page max width.';
    end if;
  end if;

  return new;
end;
$$;

create or replace function public.tg_gallery_settings_restrict_sensitive_fields()
returns trigger
language plpgsql
as $$
begin
  if tg_op <> 'UPDATE' then
    return new;
  end if;

  if auth.uid() is null or coalesce(auth.role(), '') = 'service_role' then
    return new;
  end if;

  if not public.cms_is_admin() then
    if new.thumbnail_entrance_preset is distinct from old.thumbnail_entrance_preset then
      raise exception 'Only admins can update thumbnail entrance preset.';
    end if;

    if new.preloader_preset is distinct from old.preloader_preset then
      raise exception 'Only admins can update preloader preset.';
    end if;

    if new.nav_button_preset is distinct from old.nav_button_preset then
      raise exception 'Only admins can update nav button preset.';
    end if;
  end if;

  return new;
end;
$$;

commit;
