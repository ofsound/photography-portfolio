alter table public.site_settings
  add column if not exists homepage_slide_duration_ms integer not null default 4000
    check (homepage_slide_duration_ms between 1000 and 30000),
  add column if not exists homepage_transition_duration_ms integer not null default 2000
    check (homepage_transition_duration_ms between 200 and 10000);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'site_settings_homepage_transition_lte_slide'
  ) then
    alter table public.site_settings
      add constraint site_settings_homepage_transition_lte_slide
      check (homepage_transition_duration_ms <= homepage_slide_duration_ms);
  end if;
end
$$;
