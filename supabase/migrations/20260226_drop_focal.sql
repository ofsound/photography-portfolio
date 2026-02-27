-- Remove focal_x, focal_y from photo_images (replaced by thumb_crop_x, thumb_crop_y, thumb_crop_zoom)

begin;

alter table public.photo_images drop column if exists focal_x;
alter table public.photo_images drop column if exists focal_y;

-- Drop the old overload that had p_focal_x, p_focal_y (CREATE OR REPLACE cannot change signature)
drop function if exists public.insert_photo_image(uuid, text, text, bigint, public.asset_kind, integer, text, numeric, numeric);

create or replace function public.insert_photo_image(
  p_photo_id uuid,
  p_source_path text,
  p_source_mime text,
  p_source_bytes bigint,
  p_kind public.asset_kind,
  p_position integer,
  p_alt_text text default null
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_id uuid;
begin
  if not public.cms_can_edit() then
    raise exception 'Unauthorized';
  end if;

  if not exists (select 1 from public.photos where id = p_photo_id) then
    raise exception 'Photo not found';
  end if;

  if p_kind = 'lead' then
    update public.photo_images
    set kind = 'additional'
    where photo_id = p_photo_id and kind = 'lead';
  end if;

  insert into public.photo_images (
    photo_id,
    source_storage_path,
    source_mime_type,
    source_bytes,
    delivery_storage_path,
    delivery_mime_type,
    delivery_bytes,
    kind,
    position,
    alt_text
  ) values (
    p_photo_id,
    p_source_path,
    p_source_mime::text,
    p_source_bytes,
    null,
    null,
    null,
    p_kind,
    p_position,
    p_alt_text
  )
  returning id into v_id;

  return v_id;
end;
$$;

commit;
