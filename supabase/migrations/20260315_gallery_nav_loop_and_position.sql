-- Add loop_gallery_navigation and show_photo_info_position to both tables

alter table public.site_settings
  add column
if not exists loop_gallery_navigation boolean not null default true,
add column
if not exists show_photo_info_position boolean not null default false;

alter table public.gallery_settings
  add column
if not exists loop_gallery_navigation boolean not null default true,
add column
if not exists show_photo_info_position boolean not null default false;

-- Update RPCs to accept p_loop parameter

create or replace function public.gallery_photo_neighbors_scoped
(
  p_gallery_id uuid,
  p_photo_id uuid,
  p_loop boolean default true
)
returns table
(
  prev_slug text,
  next_slug text
)
language sql
security invoker
set search_path
= public
as $$
with
    ordered
    as
    (
        select
            p.id,
            p.slug,
            row_number() over (
        order by
          p.gallery_sort_order asc nulls last,
          coalesce(p.capture_date, '') desc,
          p.created_at
     desc,
          p.id desc
      ) as rn
    from public.photos p
    where p.gallery_id = p_gallery_id
      and p.status = 'published'
      and p.deleted_at is null
  ),
  ranked as
(
    select
    o.*,
    count(*) over () as total
from ordered o
  )
,
  current_row as
(
    select *
from ranked
where id = p_photo_id
limit 1
  ),
  prev_row as
(
    select r.slug
from ranked r
    join current_row c
    on r.rn = case
        when c.rn = 1 then (case when p_loop then c.total else null end)
        else c.rn - 1
      end
  )
,
  next_row as
(
    select r.slug
from ranked r
    join current_row c
    on r.rn = case
        when c.rn = c.total then (case when p_loop then 1 else null end)
        else c.rn + 1
      end
  )
select
    (select slug
    from prev_row),
    (select slug
    from next_row);
$$;

create or replace function public.all_photo_neighbors
(
  p_photo_id uuid,
  p_loop boolean default true
)
returns table
(
  prev_slug text,
  next_slug text
)
language sql
security invoker
set search_path
= public
as $$
with
    ordered
    as
    (
        select
            p.id,
            p.slug,
            row_number() over (
        order by
          coalesce(p.capture_date, '') desc,
          p.created_at desc,
          p.id desc
      ) as rn
        from public.photos p
            join public.galleries g on g.id = p.gallery_id
        where p.status = 'published'
            and p.deleted_at is null
            and g.visibility_status = 'public'
    ),
    ranked
    as
    (
        select
            o.*,
            count(*) over () as total
        from ordered o
    ),
    current_row
    as
    (
        select *
        from ranked
        where id = p_photo_id
    
    limit 1
  ),
  prev_row as
(
    select r.slug
from ranked r
    join current_row c
    on r.rn = case
        when c.rn = 1 then (case when p_loop then c.total else null end)
        else c.rn - 1
      end
  )
,
  next_row as
(
    select r.slug
from ranked r
    join current_row c
    on r.rn = case
        when c.rn = c.total then (case when p_loop then 1 else null end)
        else c.rn + 1
      end
  )
select
    (select slug
    from prev_row),
    (select slug
    from next_row);
$$;

create or replace function public.gallery_photo_neighbors
(p_photo_id uuid, p_loop boolean default true)
returns table
(
  prev_slug text,
  next_slug text
)
language sql
security invoker
set search_path
= public
as $$
select *
from public.all_photo_neighbors(p_photo_id, p_loop);
$$;
