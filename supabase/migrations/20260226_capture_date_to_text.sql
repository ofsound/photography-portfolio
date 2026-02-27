-- Convert capture_date from date to text for free-form input (e.g. "2024", "Summer 2024")

begin;

drop index if exists public.photos_public_idx;
alter table public.photos alter column capture_date type text using capture_date::text;
create index photos_public_idx on public.photos (status, deleted_at, capture_date desc, created_at desc);

commit;
