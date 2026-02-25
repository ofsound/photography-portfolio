<script lang="ts">
  import type { AdminCategory, AdminTag } from '$lib/types/content';

  let {
    categories,
    tags,
    taxonomyDraftCategories,
    taxonomyDraftTags,
    selectedPhotoIds,
    categoryById,
    tagById,
    addTaxonomyDraft,
    removeTaxonomyDraft,
    clearTaxonomyDraft,
    onTaxChipDragStart,
    onTaxDragOver,
    onTaxDrop,
    onTaxDragEnd
  } = $props<{
    categories: AdminCategory[];
    tags: AdminTag[];
    taxonomyDraftCategories: string[];
    taxonomyDraftTags: string[];
    selectedPhotoIds: string[];
    categoryById: (id: string) => AdminCategory | null;
    tagById: (id: string) => AdminTag | null;
    addTaxonomyDraft: (type: 'category' | 'tag', id: string) => void;
    removeTaxonomyDraft: (type: 'category' | 'tag', id: string) => void;
    clearTaxonomyDraft: () => void;
    onTaxChipDragStart: (type: 'category' | 'tag', id: string, event: DragEvent) => void;
    onTaxDragOver: (event: DragEvent) => void;
    onTaxDrop: (event: DragEvent) => void;
    onTaxDragEnd: () => void;
  }>();
</script>

<div class="grid gap-3 rounded border border-border p-3 lg:grid-cols-3">
  <div class="grid gap-2">
    <p class="text-xs uppercase tracking-[0.12em]">Drag Category Chips</p>
    <div class="flex flex-wrap gap-2">
      {#each categories as category (category.id)}
        <button
          type="button"
          draggable="true"
          ondragstart={(event) => onTaxChipDragStart('category', category.id, event)}
          ondragend={onTaxDragEnd}
          onclick={() => addTaxonomyDraft('category', category.id)}
          class="rounded border border-border-strong px-2 py-1 text-xs"
        >
          {category.name}
        </button>
      {/each}
    </div>
  </div>

  <div class="grid gap-2">
    <p class="text-xs uppercase tracking-[0.12em]">Drag Tag Chips</p>
    <div class="flex flex-wrap gap-2">
      {#each tags as tag (tag.id)}
        <button
          type="button"
          draggable="true"
          ondragstart={(event) => onTaxChipDragStart('tag', tag.id, event)}
          ondragend={onTaxDragEnd}
          onclick={() => addTaxonomyDraft('tag', tag.id)}
          class="rounded border border-border-strong px-2 py-1 text-xs"
        >
          {tag.name}
        </button>
      {/each}
    </div>
  </div>

  <form method="POST" action="?/bulkAssignTaxonomy" class="grid gap-2 rounded border border-border-strong p-2" ondragover={onTaxDragOver} ondrop={onTaxDrop}>
    <input type="hidden" name="selected_photo_ids" value={selectedPhotoIds.join('\n')} />
    {#each taxonomyDraftCategories as categoryId (categoryId)}
      <input type="hidden" name="category_ids" value={categoryId} />
    {/each}
    {#each taxonomyDraftTags as tagId (tagId)}
      <input type="hidden" name="tag_ids" value={tagId} />
    {/each}

    <p class="text-xs uppercase tracking-[0.12em]">Drop Taxonomy Here</p>

    <div class="flex flex-wrap gap-2">
      {#each taxonomyDraftCategories as categoryId (categoryId)}
        {#if categoryById(categoryId)}
          <button type="button" class="rounded border border-info/40 bg-info-soft px-2 py-1 text-xs" onclick={() => removeTaxonomyDraft('category', categoryId)}>
            {categoryById(categoryId)?.name ?? categoryId} x
          </button>
        {/if}
      {/each}
      {#each taxonomyDraftTags as tagId (tagId)}
        {#if tagById(tagId)}
          <button type="button" class="rounded border border-success/40 bg-success-soft px-2 py-1 text-xs" onclick={() => removeTaxonomyDraft('tag', tagId)}>
            {tagById(tagId)?.name ?? tagId} x
          </button>
        {/if}
      {/each}
    </div>

    <div class="flex flex-wrap items-center gap-2">
      <button type="button" class="rounded border border-border-strong px-2 py-1 text-xs" onclick={clearTaxonomyDraft}>Clear Draft</button>
      <button
        class="rounded border border-border-strong px-3 py-1 text-xs uppercase tracking-[0.14em]"
        type="submit"
        disabled={selectedPhotoIds.length === 0 || (taxonomyDraftCategories.length === 0 && taxonomyDraftTags.length === 0)}
      >
        Apply Draft Taxonomy
      </button>
    </div>
  </form>
</div>
