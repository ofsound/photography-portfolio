-- Remove category sort order: drop index and column.
drop index if exists public.categories_active_sort_idx;
alter table public.categories drop column if exists sort_order;

-- Order categories by name for consistent listing.
create index categories_active_name_idx on public.categories (is_active, name);
