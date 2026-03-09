begin;

alter table public.pages
  add column if not exists hero_vertical_alignment_pct integer;

update public.pages
set hero_vertical_alignment_pct = greatest(
  0,
  least(100, coalesce(hero_vertical_alignment_pct, 50))
);

alter table public.pages
  alter column hero_vertical_alignment_pct set default 50,
  alter column hero_vertical_alignment_pct set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'pages_hero_vertical_alignment_pct_range'
  ) then
    alter table public.pages
      add constraint pages_hero_vertical_alignment_pct_range
      check (hero_vertical_alignment_pct between 0 and 100);
  end if;
end
$$;

commit;
