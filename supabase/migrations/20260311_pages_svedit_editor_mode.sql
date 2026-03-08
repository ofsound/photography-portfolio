begin;

create type public.page_editor_mode as enum ('code', 'svedit');

alter table public.pages
  add column editor_mode public.page_editor_mode not null default 'code',
  add column svedit_doc jsonb,
  add column svedit_schema_version integer not null default 1;

alter table public.pages
  add constraint pages_svedit_schema_version_positive
  check (svedit_schema_version > 0);

commit;
