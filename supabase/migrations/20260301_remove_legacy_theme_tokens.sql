begin;

do $$
declare
  legacy_col text := 'tail' || 'wind' || '_pal' || 'ette';
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'site_settings'
      and column_name = legacy_col
  ) then
    execute format('alter table public.site_settings drop column if exists %I', legacy_col);
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
  end if;

  return new;
end;
$$;

commit;
