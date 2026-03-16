begin;

    do $$
    begin
        if not exists (
    select 1
        from pg_type
        where typname = 'floating_panel_position'
            and typnamespace = 'public'::regnamespace
  ) then
        create type public.floating_panel_position as enum
        (
      'bottom_left',
      'top_right',
      'bottom_right'
    );
    end
    if;
end
$$;

alter table public.site_settings
  add column
if not exists floating_panel_position public.floating_panel_position not null default 'bottom_left';

alter table public.gallery_settings
  add column
if not exists floating_panel_position public.floating_panel_position not null default 'bottom_left';

commit;
