-- Add draft support for photos and enforce status/deleted_at consistency.

begin;

alter type public.publish_status add value if not exists 'draft';

alter table public.photos
  alter column status set default 'draft';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'photos_status_deleted_at_ck'
      and conrelid = 'public.photos'::regclass
  ) then
    alter table public.photos
      add constraint photos_status_deleted_at_ck
      check (
        (status = 'archived' and deleted_at is not null)
        or (status in ('draft', 'published') and deleted_at is null)
      ) not valid;
  end if;
end
$$;

create index if not exists photos_admin_status_updated_idx
  on public.photos (status, deleted_at, updated_at desc);

commit;
