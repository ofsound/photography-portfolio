-- Transactional RPCs for critical multi-step writes.
-- All functions run as SECURITY INVOKER so RLS applies (cms_can_edit required).

begin;

create or replace function public.set_lead_image(p_photo_id uuid, p_image_id uuid)
returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  if not public.cms_can_edit() then
    raise exception 'Unauthorized';
  end if;

  if not exists (
    select 1 from public.photo_images
    where id = p_image_id and photo_id = p_photo_id and is_active
  ) then
    raise exception 'Image not found or inactive';
  end if;

  update public.photo_images
  set kind = 'additional'
  where photo_id = p_photo_id and kind = 'lead';

  update public.photo_images
  set kind = 'lead'
  where id = p_image_id and photo_id = p_photo_id;
end;
$$;

create or replace function public.save_photo_relations(
  p_photo_id uuid,
  p_category_ids uuid[],
  p_tag_ids uuid[]
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  cid uuid;
  tid uuid;
begin
  if not public.cms_can_edit() then
    raise exception 'Unauthorized';
  end if;

  if not exists (select 1 from public.photos where id = p_photo_id) then
    raise exception 'Photo not found';
  end if;

  delete from public.photo_categories where photo_id = p_photo_id;
  delete from public.photo_tags where photo_id = p_photo_id;

  foreach cid in array p_category_ids
  loop
    if exists (select 1 from public.categories where id = cid and is_active) then
      insert into public.photo_categories (photo_id, category_id) values (p_photo_id, cid);
    end if;
  end loop;

  foreach tid in array p_tag_ids
  loop
    if exists (select 1 from public.tags where id = tid and is_active) then
      insert into public.photo_tags (photo_id, tag_id) values (p_photo_id, tid);
    end if;
  end loop;
end;
$$;

create or replace function public.save_homepage_slides(p_slides jsonb)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  slide jsonb;
  idx int := 0;
begin
  if not public.cms_can_edit() then
    raise exception 'Unauthorized';
  end if;

  delete from public.homepage_slides;

  for slide in select * from jsonb_array_elements(p_slides)
  loop
    insert into public.homepage_slides (photo_image_id, position, is_active)
    values (
      (slide->>'photo_image_id')::uuid,
      idx,
      coalesce((slide->>'is_active')::boolean, true)
    );
    idx := idx + 1;
  end loop;
end;
$$;

create or replace function public.insert_photo_image(
  p_photo_id uuid,
  p_source_path text,
  p_source_mime text,
  p_source_bytes bigint,
  p_kind public.asset_kind,
  p_position integer,
  p_alt_text text default null,
  p_focal_x numeric default 0.5,
  p_focal_y numeric default 0.5
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
    alt_text,
    focal_x,
    focal_y
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
    p_alt_text,
    p_focal_x,
    p_focal_y
  )
  returning id into v_id;

  return v_id;
end;
$$;

commit;
