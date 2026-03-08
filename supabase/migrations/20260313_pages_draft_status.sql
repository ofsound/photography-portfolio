begin;

update public.pages
set status = 'draft'
where status = 'archived';

update public.content_revisions
set snapshot = jsonb_set(snapshot, '{status}', '"draft"'::jsonb, false)
where entity_type = 'page'
  and snapshot ? 'status'
  and snapshot ->> 'status' = 'archived';

alter table public.pages
  drop constraint if exists pages_status_no_archived_ck;

alter table public.pages
  add constraint pages_status_no_archived_ck
  check (status in ('published', 'draft'));

commit;
