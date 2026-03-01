-- Targeted neighbor lookup for gallery detail navigation.
-- Avoids loading all published photo IDs into application memory.

begin;

create or replace function public.gallery_photo_neighbors(p_photo_id uuid)
returns table (
  prev_slug text,
  next_slug text
)
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_capture_date text;
  v_created_at timestamptz;
  v_id uuid;
begin
  select p.capture_date, p.created_at, p.id
  into v_capture_date, v_created_at, v_id
  from public.photos p
  where p.id = p_photo_id
    and p.status = 'published'
    and p.deleted_at is null
  limit 1;

  if not found then
    return query select null::text, null::text;
    return;
  end if;

  -- Previous item in DESC order: nearest row with a greater sort tuple.
  select p.slug
  into prev_slug
  from public.photos p
  where p.status = 'published'
    and p.deleted_at is null
    and p.id <> v_id
    and (coalesce(p.capture_date, ''), p.created_at, p.id)
      > (coalesce(v_capture_date, ''), v_created_at, v_id)
  order by
    coalesce(p.capture_date, '') asc,
    p.created_at asc,
    p.id asc
  limit 1;

  if prev_slug is null then
    -- Wrap-around to the first row in the global DESC ordering.
    select p.slug
    into prev_slug
    from public.photos p
    where p.status = 'published'
      and p.deleted_at is null
      and p.id <> v_id
    order by
      coalesce(p.capture_date, '') desc,
      p.created_at desc,
      p.id desc
    limit 1;
  end if;

  -- Next item in DESC order: nearest row with a smaller sort tuple.
  select p.slug
  into next_slug
  from public.photos p
  where p.status = 'published'
    and p.deleted_at is null
    and p.id <> v_id
    and (coalesce(p.capture_date, ''), p.created_at, p.id)
      < (coalesce(v_capture_date, ''), v_created_at, v_id)
  order by
    coalesce(p.capture_date, '') desc,
    p.created_at desc,
    p.id desc
  limit 1;

  if next_slug is null then
    -- Wrap-around to the last row in the global DESC ordering.
    select p.slug
    into next_slug
    from public.photos p
    where p.status = 'published'
      and p.deleted_at is null
      and p.id <> v_id
    order by
      coalesce(p.capture_date, '') asc,
      p.created_at asc,
      p.id asc
    limit 1;
  end if;

  return query select prev_slug, next_slug;
end;
$$;

-- Supports ordered neighbor probes on published, non-deleted photos.
create index if not exists photos_public_neighbor_idx
  on public.photos (
    status,
    deleted_at,
    (coalesce(capture_date, '')) desc,
    created_at desc,
    id desc
  );

commit;
