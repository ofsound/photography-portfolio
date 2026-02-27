-- Add admin_sort_order for drag-and-drop reordering in admin photos grid.
-- Null values sort last (new photos get null until explicitly reordered).
alter table public.photos
  add column if not exists admin_sort_order integer;

create index if not exists photos_admin_sort_idx
  on public.photos (admin_sort_order nulls last, updated_at desc);
