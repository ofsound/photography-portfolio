-- Replace width_px and height_px with a single dimensions text field on photos and photo_images

begin;

-- photos table
alter table public.photos add column if not exists dimensions text;
update public.photos
set dimensions = case
  when width_px is not null and height_px is not null then width_px::text || ' x ' || height_px::text
  else null
end;
alter table public.photos drop column if exists width_px;
alter table public.photos drop column if exists height_px;

-- photo_images table
alter table public.photo_images add column if not exists dimensions text;
update public.photo_images
set dimensions = case
  when width_px is not null and height_px is not null then width_px::text || ' x ' || height_px::text
  else null
end;
alter table public.photo_images drop column if exists width_px;
alter table public.photo_images drop column if exists height_px;

commit;
