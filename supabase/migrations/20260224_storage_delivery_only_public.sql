-- Lock down storage: only delivery/ objects are publicly readable.
-- Source assets remain private; CMS and Edge Function use authenticated/service role.

begin;

drop policy if exists "Public can read photos bucket" on storage.objects;

create policy "Public can read delivery objects only"
on storage.objects
for select
using (bucket_id = 'photos' and name like 'delivery/%');

commit;
