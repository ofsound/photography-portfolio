<script lang="ts">
  import AdminButton from '$lib/components/admin/AdminButton.svelte';
  import FormField from '$lib/components/FormField.svelte';
  import FormInput from '$lib/components/FormInput.svelte';
  import type { AdminCategory, AdminTag } from '$lib/types/content';

  const selectClass = 'w-full max-w-[180px] rounded border border-border-strong bg-surface px-3 py-2 text-sm';

  let {
    q,
    categories,
    tags,
    filterCategoryId,
    filterTagId,
    showArchived,
    densityVisible = false,
    densityColCount = 6,
    densityMax = 20,
    onDensityChange
  } = $props<{
    q: string;
    categories: AdminCategory[];
    tags: AdminTag[];
    filterCategoryId: string;
    filterTagId: string;
    showArchived: boolean;
    densityVisible?: boolean;
    densityColCount?: number;
    densityMax?: number;
    onDensityChange?: (value: number) => void;
  }>();
</script>

<form method="GET" class="mt-4 flex flex-wrap items-end gap-3 rounded border border-border p-3">
  <div class="flex flex-wrap items-end gap-3">
    {#if densityVisible && onDensityChange}
      <FormField label="Density" id="filter-density">
        <div class="flex items-center gap-2">
          <input
            id="filter-density"
            type="range"
            min="1"
            max={String(densityMax)}
            value={densityColCount}
            oninput={(e) => onDensityChange(Number((e.currentTarget as HTMLInputElement).value))}
          />
          <span class="tabular-nums">{densityColCount}</span>
        </div>
      </FormField>
    {/if}
    <div class="min-w-0 max-w-[230px] flex-1">
      <FormField label="Search" id="filter-q">
        <FormInput id="filter-q" name="q" value={q} placeholder="Search photos" />
      </FormField>
    </div>
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

  <div class="flex flex-wrap items-center gap-2">
    <AdminButton type="submit">Apply</AdminButton>
  </div>
</form>

