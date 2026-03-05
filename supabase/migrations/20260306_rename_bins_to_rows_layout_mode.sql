-- Rename 'bins' layout mode enum value to 'rows'
do $$
begin
  if exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    join pg_enum e on e.enumtypid = t.oid
    where n.nspname = 'public'
      and t.typname = 'layout_mode'
      and e.enumlabel = 'bins'
  )
  and not exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    join pg_enum e on e.enumtypid = t.oid
    where n.nspname = 'public'
      and t.typname = 'layout_mode'
      and e.enumlabel = 'rows'
  ) then
    alter type public.layout_mode rename value 'bins' to 'rows';
  end if;
end
$$;
