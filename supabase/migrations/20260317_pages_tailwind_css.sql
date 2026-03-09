begin;

alter table public.pages
  add column tailwind_css text not null default '';

commit;
