begin;

    alter table public.site_settings
  add column
    if not exists preloader_preset text not null default 'minimal';

alter table public.gallery_settings
  add column
if not exists preloader_preset text not null default 'minimal';

update public.site_settings
set preloader_preset = coalesce(nullif(preloader_preset, ''), 'minimal')
where singleton_id = 1;

update public.gallery_settings
set preloader_preset = coalesce(nullif(preloader_preset, ''), 'minimal');

create or replace function public.tg_site_settings_restrict_sensitive_fields
()
returns trigger
language plpgsql
as $$
begin
    if tg_op <> 'UPDATE' then
    return new;
end
if;

  if auth.uid() is null or coalesce(auth.role(), '') = 'service_role' then
return new;
end
if;

  if not public.cms_is_admin() then
if new.transition_preset is distinct from old.transition_preset then
      raise exception 'Only admins can update transition preset.';
end
if;

    if new.thumbnail_entrance_preset is distinct from old.thumbnail_entrance_preset then
      raise exception 'Only admins can update thumbnail entrance preset.';
end
if;

    if new.preloader_preset is distinct from old.preloader_preset then
      raise exception 'Only admins can update preloader preset.';
end
if;

    if new.public_font_import_url is distinct from old.public_font_import_url
    or new.public_font_family is distinct from old.public_font_family
    or new.admin_font_import_url is distinct from old.admin_font_import_url
    or new.admin_font_family is distinct from old.admin_font_family then
      raise exception 'Only admins can update typography settings.';
end
if;

    if new.brand_light_hex is distinct from old.brand_light_hex
    or new.brand_dark_hex is distinct from old.brand_dark_hex
    or new.brand_contrast_light_hex is distinct from old.brand_contrast_light_hex
    or new.brand_contrast_dark_hex is distinct from old.brand_contrast_dark_hex then
      raise exception 'Only admins can update brand color settings.';
end
if;

    if new.default_page_max_width_px is distinct from old.default_page_max_width_px then
      raise exception 'Only admins can update default page max width.';
end
if;
  end
if;

  return new;
end;
$$;

create or replace function public.tg_gallery_settings_restrict_sensitive_fields
()
returns trigger
language plpgsql
as $$
begin
    if tg_op <> 'UPDATE' then
    return new;
end
if;

  if auth.uid() is null or coalesce(auth.role(), '') = 'service_role' then
return new;
end
if;

  if not public.cms_is_admin() then
if new.transition_preset is distinct from old.transition_preset then
      raise exception 'Only admins can update transition preset.';
end
if;

    if new.thumbnail_entrance_preset is distinct from old.thumbnail_entrance_preset then
      raise exception 'Only admins can update thumbnail entrance preset.';
end
if;

    if new.preloader_preset is distinct from old.preloader_preset then
      raise exception 'Only admins can update preloader preset.';
end
if;
  end
if;

  return new;
end;
$$;

commit;
