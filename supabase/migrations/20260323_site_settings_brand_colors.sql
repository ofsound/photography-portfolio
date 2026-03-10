begin;

alter table public.site_settings
  add column if not exists brand_light_hex text not null default '#4f46e5',
  add column if not exists brand_dark_hex text not null default '#a5b4fc',
  add column if not exists brand_contrast_light_hex text not null default '#eef2ff',
  add column if not exists brand_contrast_dark_hex text not null default '#1e1b4b';

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
  end if;

  return new;
end;
$$;

commit;
