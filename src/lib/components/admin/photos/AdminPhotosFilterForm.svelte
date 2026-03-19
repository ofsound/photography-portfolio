<script lang="ts">
  import AdminButton from '$lib/components/admin/AdminButton.svelte';
  import FormField from '$lib/components/FormField.svelte';
  import FormInput from '$lib/components/FormInput.svelte';
  import FormSelect from '$lib/components/FormSelect.svelte';
  import ZoomControl from '$lib/components/ZoomControl.svelte';
  import type { AdminCategory, AdminTag } from '$lib/types/content';

  const {
    q,
    categories,
    tags,
    filterCategoryId,
    filterTagId,
    filterGalleryId = '',
    galleries = [],
    showGalleryFilter = false,
    showArchived,
    densityVisible = false,
    densityColCount = 6,
    densityMax = 20,
    onDensityChange,
  } = $props<{
    q: string;
    categories: AdminCategory[];
    tags: AdminTag[];
    filterCategoryId: string;
    filterTagId: string;
    filterGalleryId?: string;
    galleries?: Array<{ id: string; slug: string; name: string }>;
    showGalleryFilter?: boolean;
    showArchived: boolean;
    densityVisible?: boolean;
    densityColCount?: number;
    densityMax?: number;
    onDensityChange?: (value: number) => void;
  }>();

  const filterFormId = 'admin-photos-filter-form';

  let showFilters = $state(false);
</script>

<div
  class="my-6 flex w-full flex-col gap-3 md:flex-row md:flex-wrap md:items-end"
>
  <div class="flex items-center gap-3 md:hidden">
    <label
      class="flex cursor-pointer items-center gap-2 text-xs tracking-widest uppercase"
    >
      <input
        type="checkbox"
        bind:checked={showFilters}
        class="rounded border-border"
      />
      Show Filters
    </label>
  </div>

  <form
    id={filterFormId}
    method="GET"
    class={`min-w-0 flex-1 flex-col gap-3 md:flex md:flex-row md:flex-wrap md:items-end ${showFilters ? 'flex' : 'hidden'}`}
  >
    <input type="hidden" name="showArchived" value={showArchived ? '1' : '0'} />
    <div class="w-full md:max-w-xs md:min-w-44 md:flex-1">
      <FormField label="Search" id="filter-q">
        <FormInput
          id="filter-q"
          name="q"
          value={q}
          placeholder="Search photos"
        />
      </FormField>
    </div>
    <div class="w-full md:max-w-56 md:min-w-36 md:flex-1">
      <FormField label="Category" id="filter-category">
        <FormSelect
          id="filter-category"
          name="category"
          value={filterCategoryId}
        >
          <option value="">All</option>
          {#each categories as category (category.id)}
            <option value={category.id}>{category.name}</option>
          {/each}
        </FormSelect>
      </FormField>
    </div>
    <div class="w-full md:max-w-56 md:min-w-36 md:flex-1">
      <FormField label="Tag" id="filter-tag">
        <FormSelect id="filter-tag" name="tag" value={filterTagId}>
          <option value="">All</option>
          {#each tags as tag (tag.id)}
            <option value={tag.id}>{tag.name}</option>
          {/each}
        </FormSelect>
      </FormField>
    </div>
    {#if showGalleryFilter}
      <div class="w-full md:max-w-56 md:min-w-36 md:flex-1">
        <FormField label="Gallery" id="filter-gallery">
          <FormSelect
            id="filter-gallery"
            name="gallery"
            value={filterGalleryId}
          >
            <option value="">All</option>
            {#each galleries as gallery (gallery.id)}
              <option value={gallery.id}>{gallery.name}</option>
            {/each}
          </FormSelect>
        </FormField>
      </div>
    {/if}

    <div class="mt-2 mb-1 w-full md:mt-0 md:w-auto">
      <AdminButton type="submit">Apply</AdminButton>
    </div>
  </form>
  {#if densityVisible && onDensityChange}
    <div class="mb-1 ml-auto hidden md:flex">
      <ZoomControl
        label="Items Per Row"
        min={1}
        max={densityMax}
        value={densityColCount}
        onUpdate={onDensityChange}
      />
    </div>
  {/if}
</div>
