-- Transactional RPC for normalizing photo image positions and lead assignment.

begin;

create or replace function public.normalize_photo_image_positions(p_photo_id uuid)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_lead_id uuid;
begin
  if not public.cms_can_edit() then
    raise exception 'Unauthorized';
  end if;

  if not exists (
    select 1
    from public.photos
    where id = p_photo_id
  ) then
    raise exception 'Photo not found';
  end if;

  if not exists (
    select 1
    from public.photo_images
    where photo_id = p_photo_id
  ) then
    return;
  end if;

  select id
  into v_lead_id
  from public.photo_images
  where photo_id = p_photo_id
    and kind = 'lead'
  order by position, id
  limit 1;

  if v_lead_id is null then
    select id
    into v_lead_id
    from public.photo_images
    where photo_id = p_photo_id
    order by position, id
    limit 1;

    if v_lead_id is not null then
      update public.photo_images
      set kind = 'lead'
      where id = v_lead_id
        and photo_id = p_photo_id;
    end if;
  end if;

  -- Stage all positions first to avoid unique(photo_id, position) conflicts.
  with staged as (
    select id, row_number() over (order by position, id) - 1 as rn
    from public.photo_images
    where photo_id = p_photo_id
  )
  update public.photo_images pi
  set position = 100000 + s.rn
  from staged s
  where pi.id = s.id;

  if v_lead_id is not null then
    update public.photo_images
    set kind = 'lead', position = 0
    where id = v_lead_id
      and photo_id = p_photo_id;
  end if;

  with additional as (
    select id, row_number() over (order by position, id) - 1 as rn
    from public.photo_images
    where photo_id = p_photo_id
      and (v_lead_id is null or id <> v_lead_id)
  )
  update public.photo_images pi
  set kind = 'additional', position = a.rn + 1
  from additional a
  where pi.id = a.id;
end;
$$;

commit;
