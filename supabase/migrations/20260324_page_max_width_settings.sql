begin;

alter table public.site_settings
  add column if not exists default_page_max_width_px integer not null default 1280;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'site_settings_default_page_max_width_px_positive'
      and conrelid = 'public.site_settings'::regclass
  ) then
    alter table public.site_settings
      add constraint site_settings_default_page_max_width_px_positive
      check (default_page_max_width_px > 0);
  end if;
end;
$$;

alter table public.pages
  add column if not exists max_width_override_px integer;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'pages_max_width_override_px_positive'
      and conrelid = 'public.pages'::regclass
  ) then
    alter table public.pages
      add constraint pages_max_width_override_px_positive
      check (max_width_override_px is null or max_width_override_px > 0);
  end if;
end;
$$;

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
    if new.transition_preset is distinct from old.transition_preset then
      raise exception 'Only admins can update transition preset.';
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

commit;
