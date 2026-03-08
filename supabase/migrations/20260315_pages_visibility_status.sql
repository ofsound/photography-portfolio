begin;

create type public.page_visibility_status as enum (
  'public',
  'unlisted',
  'draft'
);

alter table public.pages
  add column visibility_status public.page_visibility_status;

update public.pages
set visibility_status = case
  when status = 'draft' then 'draft'::public.page_visibility_status
  else 'public'::public.page_visibility_status
end
where visibility_status is null;

alter table public.pages
  alter column visibility_status set default 'draft',
  alter column visibility_status set not null;

drop index if exists public.pages_public_idx;
create index pages_visibility_public_idx
  on public.pages (visibility_status, deleted_at, kind, nav_order, slug);

drop policy if exists pages_public_read on public.pages;
create policy pages_public_read
on public.pages
for select
using (
  deleted_at is null
  and (public.cms_can_edit() or visibility_status <> 'draft')
);

alter table public.pages
  drop column status,
  drop column show_in_nav;

commit;
