<script lang="ts">
  import AdminButton from '$lib/components/admin/AdminButton.svelte';
  import FormField from '$lib/components/FormField.svelte';
  import FormInput from '$lib/components/FormInput.svelte';
  import type { AdminCategory, AdminTag } from '$lib/types/content';

  const selectClass = 'w-full rounded border border-border-strong bg-surface px-3 py-2 text-sm';

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
  <div class="lg:col-span-2">
    <FormField label="Search" id="filter-q">
      <FormInput id="filter-q" name="q" value={q} placeholder="Search photos" />
    </FormField>
  </div>
  <FormField label="Category" id="filter-category">
    <select id="filter-category" name="category" class={selectClass}>
      <option value="">all</option>
      {#each categories as category (category.id)}
        <option value={category.id} selected={filterCategoryId === category.id}>{category.name}</option>
      {/each}
    </select>
  </FormField>
  <FormField label="Tag" id="filter-tag">
    <select id="filter-tag" name="tag" class={selectClass}>
      <option value="">all</option>
      {#each tags as tag (tag.id)}
        <option value={tag.id} selected={filterTagId === tag.id}>{tag.name}</option>
      {/each}
    </select>
  </FormField>
  <FormField label="Conversion" id="filter-conversion">
    <select id="filter-conversion" name="conversion" class={selectClass}>
      <option value="all" selected={filterConversion === 'all'}>all</option>
      <option value="pending" selected={filterConversion === 'pending'}>pending</option>
      <option value="ready" selected={filterConversion === 'ready'}>ready</option>
      <option value="mixed" selected={filterConversion === 'mixed'}>mixed</option>
      <option value="no-images" selected={filterConversion === 'no-images'}>no images</option>
    </select>
  </FormField>

  <div class="flex flex-wrap items-center gap-2">
    <label class="flex items-center gap-2 text-sm">
      <input type="checkbox" name="showArchived" value="1" checked={showArchived} /> Archived only
    </label>
    <AdminButton type="submit">Apply</AdminButton>
  </div>
</form>

