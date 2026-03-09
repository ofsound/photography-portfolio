begin;

alter table public.pages
  add column if not exists bg_image_id uuid;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'pages_bg_image_id_fkey'
      and conrelid = 'public.pages'::regclass
  ) then
    alter table public.pages
      add constraint pages_bg_image_id_fkey
      foreign key (bg_image_id)
      references public.photo_images (id)
      on delete set null;
  end if;
end;
$$;

commit;
