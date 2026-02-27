<script lang="ts">
  import AdminButton from '$lib/components/admin/AdminButton.svelte';
  import type { AdminCategory, AdminTag } from '$lib/types/content';

  let {
    q,
    categories,
    tags,
    filterCategoryId,
    filterTagId,
    filterConversion,
    showArchived
  } = $props<{
    q: string;
    categories: AdminCategory[];
    tags: AdminTag[];
    filterCategoryId: string;
    filterTagId: string;
    filterConversion: 'all' | 'pending' | 'ready' | 'mixed' | 'no-images';
    showArchived: boolean;
  }>();
</script>

<form method="GET" class="mt-4 grid gap-3 rounded border border-border p-3 lg:grid-cols-6 lg:items-end">
  <label class="grid gap-1 text-xs uppercase tracking-[0.12em] lg:col-span-2">
    Search
    <input name="q" value={q} placeholder="Search photos" class="rounded border border-border-strong px-3 py-2" />
  </label>

  <label class="grid gap-1 text-xs uppercase tracking-[0.12em]">
    Category
    <select name="category" class="rounded border border-border-strong px-3 py-2">
      <option value="">all</option>
      {#each categories as category (category.id)}
        <option value={category.id} selected={filterCategoryId === category.id}>{category.name}</option>
      {/each}
    </select>
  </label>

  <label class="grid gap-1 text-xs uppercase tracking-[0.12em]">
    Tag
    <select name="tag" class="rounded border border-border-strong px-3 py-2">
      <option value="">all</option>
      {#each tags as tag (tag.id)}
        <option value={tag.id} selected={filterTagId === tag.id}>{tag.name}</option>
      {/each}
    </select>
  </label>

  <label class="grid gap-1 text-xs uppercase tracking-[0.12em]">
    Conversion
    <select name="conversion" class="rounded border border-border-strong px-3 py-2">
      <option value="all" selected={filterConversion === 'all'}>all</option>
      <option value="pending" selected={filterConversion === 'pending'}>pending</option>
      <option value="ready" selected={filterConversion === 'ready'}>ready</option>
      <option value="mixed" selected={filterConversion === 'mixed'}>mixed</option>
      <option value="no-images" selected={filterConversion === 'no-images'}>no images</option>
    </select>
  </label>

  <div class="flex flex-wrap items-center gap-2">
    <label class="flex items-center gap-2 text-sm">
      <input type="checkbox" name="showArchived" value="1" checked={showArchived} /> Show archived
    </label>
    <AdminButton type="submit">Apply</AdminButton>
  </div>
</form>

