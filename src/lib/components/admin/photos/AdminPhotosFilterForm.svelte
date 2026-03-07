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
</script>

<div class="my-6 flex w-full flex-wrap items-end gap-3">
  <form method="GET" class="flex min-w-0 flex-1 flex-wrap items-end gap-3">
    <input type="hidden" name="showArchived" value={showArchived ? '1' : '0'} />
    <div class="max-w-xs min-w-44 flex-1">
      <FormField label="Search" id="filter-q">
        <FormInput
          id="filter-q"
          name="q"
          value={q}
          placeholder="Search photos"
        />
      </FormField>
    </div>
    <div class="max-w-56 min-w-36 flex-1">
      <FormField label="Category" id="filter-category">
        <FormSelect
          id="filter-category"
          name="category"
          value={filterCategoryId}
        >
          <option value="">all</option>
          {#each categories as category (category.id)}
            <option value={category.id}>{category.name}</option>
          {/each}
        </FormSelect>
      </FormField>
    </div>
    <div class="max-w-56 min-w-36 flex-1">
      <FormField label="Tag" id="filter-tag">
        <FormSelect id="filter-tag" name="tag" value={filterTagId}>
          <option value="">all</option>
          {#each tags as tag (tag.id)}
            <option value={tag.id}>{tag.name}</option>
          {/each}
        </FormSelect>
      </FormField>
    </div>
    {#if showGalleryFilter}
      <div class="max-w-56 min-w-36 flex-1">
        <FormField label="Gallery" id="filter-gallery">
          <FormSelect
            id="filter-gallery"
            name="gallery"
            value={filterGalleryId}
          >
            <option value="">all</option>
            {#each galleries as gallery (gallery.id)}
              <option value={gallery.id}>{gallery.name}</option>
            {/each}
          </FormSelect>
        </FormField>
      </div>
    {/if}

    <div class="mb-1">
      <AdminButton type="submit">Apply</AdminButton>
    </div>
  </form>
  {#if densityVisible && onDensityChange}
    <div class="mb-1 ml-auto">
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
