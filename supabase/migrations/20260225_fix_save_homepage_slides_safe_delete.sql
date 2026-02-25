begin;

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

  if p_slides is null or jsonb_typeof(p_slides) <> 'array' then
    raise exception 'p_slides must be a JSON array';
  end if;

  -- Use a guarded predicate for environments that disallow unqualified DELETE.
  delete from public.homepage_slides
  where id is not null;

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

commit;
