begin;

alter table public.site_settings
  add column public_font_import_url text not null default 'https://fonts.googleapis.com/css2?family=Gabarito:wght@400..900&display=swap',
  add column public_font_family text not null default '''Gabarito'', ''sans-serif''',
  add column admin_font_import_url text not null default 'https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&display=swap',
  add column admin_font_family text not null default '''Inter'', ''sans-serif''';

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
  end if;

  return new;
end;
$$;

commit;
