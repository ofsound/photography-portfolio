-- Transactional RPCs for reordering photos and additional images.

begin;

create or replace function public.reorder_photos(p_ordered_photo_ids uuid[])
returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  if not public.cms_can_edit() then
    raise exception 'Unauthorized';
  end if;

  if p_ordered_photo_ids is null or coalesce(array_length(p_ordered_photo_ids, 1), 0) = 0 then
    raise exception 'No photo IDs provided';
  end if;

  with raw_ids as (
    select id, ord
    from unnest(p_ordered_photo_ids) with ordinality as t(id, ord)
  ),
  ordered_ids as (
    select distinct on (id) id, ord
    from raw_ids
    order by id, ord
  )
  update public.photos p
  set admin_sort_order = o.ord - 1
  from ordered_ids o
  where p.id = o.id;
end;
$$;

create or replace function public.reorder_additional_images(
  p_photo_id uuid,
  p_ordered_image_ids uuid[]
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_base_position integer := 0;
begin
  if not public.cms_can_edit() then
    raise exception 'Unauthorized';
  end if;

  if not exists (select 1 from public.photos where id = p_photo_id) then
    raise exception 'Photo not found';
  end if;

  -- Stage all positions first to avoid unique(position) conflicts during reordering.
  with existing as (
    select id, row_number() over (order by position, id) - 1 as rn
    from public.photo_images
    where photo_id = p_photo_id
  )
  update public.photo_images pi
  set position = 100000 + e.rn
  from existing e
  where pi.id = e.id;

  with lead as (
    select id
    from public.photo_images
    where photo_id = p_photo_id
      and kind = 'lead'
    order by position, id
    limit 1
  )
  update public.photo_images pi
  set position = 0
  from lead
  where pi.id = lead.id;

  if exists (
    select 1
    from public.photo_images
    where photo_id = p_photo_id
      and kind = 'lead'
  ) then
    v_base_position := 1;
  end if;

  with raw_ids as (
    select id, ord
    from unnest(coalesce(p_ordered_image_ids, '{}'::uuid[])) with ordinality as t(id, ord)
  ),
  dedup_requested as (
    select distinct on (id) id, ord
    from raw_ids
    order by id, ord
  ),
  additional as (
    select id, position
    from public.photo_images
    where photo_id = p_photo_id
      and kind = 'additional'
  ),
  submitted as (
    select a.id, r.ord
    from additional a
    join dedup_requested r on r.id = a.id
  ),
  remaining as (
    select a.id, row_number() over (order by a.position, a.id) as ord
    from additional a
    where not exists (
      select 1
      from submitted s
      where s.id = a.id
    )
  ),
  final_order as (
    select id, row_number() over (order by bucket, ord) - 1 as idx
    from (
      select s.id, 0 as bucket, s.ord
      from submitted s
      union all
      select r.id, 1 as bucket, r.ord
      from remaining r
    ) items
  )
  update public.photo_images pi
  set position = v_base_position + f.idx
  from final_order f
  where pi.id = f.id;
end;
$$;

commit;
