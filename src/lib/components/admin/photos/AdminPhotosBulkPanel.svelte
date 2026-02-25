<script lang="ts">
  import PhotoTaxonomyEditor from '$lib/components/admin/PhotoTaxonomyEditor.svelte';
  import type { AdminCategory, AdminTag } from '$lib/types/content';

  let {
    selectedPhotoIds,
    undoCount,
    redoCount,
    categories,
    tags,
    taxonomyDraftCategories,
    taxonomyDraftTags,
    categoryById,
    tagById,
    addTaxonomyDraft,
    removeTaxonomyDraft,
    clearTaxonomyDraft,
    onTaxChipDragStart,
    onTaxDragOver,
    onTaxDrop,
    onTaxDragEnd,
    selectAllVisiblePhotos,
    clearSelectedPhotos,
    undoDraftChange,
    redoDraftChange
  } = $props<{
    selectedPhotoIds: string[];
    undoCount: number;
    redoCount: number;
    categories: AdminCategory[];
    tags: AdminTag[];
    taxonomyDraftCategories: string[];
    taxonomyDraftTags: string[];
    categoryById: (id: string) => AdminCategory | null;
    tagById: (id: string) => AdminTag | null;
    addTaxonomyDraft: (type: 'category' | 'tag', id: string) => void;
    removeTaxonomyDraft: (type: 'category' | 'tag', id: string) => void;
    clearTaxonomyDraft: () => void;
    onTaxChipDragStart: (type: 'category' | 'tag', id: string, event: DragEvent) => void;
    onTaxDragOver: (event: DragEvent) => void;
    onTaxDrop: (event: DragEvent) => void;
    onTaxDragEnd: () => void;
    selectAllVisiblePhotos: () => void;
    clearSelectedPhotos: () => void;
    undoDraftChange: () => void;
    redoDraftChange: () => void;
  }>();
</script>

<section class="mt-4 grid gap-3 rounded border border-border p-3">
  <div class="flex flex-wrap items-center gap-2 text-xs uppercase tracking-[0.12em]">
    <span>Selected photos: {selectedPhotoIds.length}</span>
    <button class="rounded border border-border-strong px-2 py-1" type="button" onclick={selectAllVisiblePhotos}>Select all visible</button>
    <button class="rounded border border-border-strong px-2 py-1" type="button" onclick={clearSelectedPhotos}>Clear</button>
    <button class="rounded border border-border-strong px-2 py-1 disabled:opacity-40" type="button" onclick={undoDraftChange} disabled={undoCount === 0}>
      Undo
    </button>
    <button class="rounded border border-border-strong px-2 py-1 disabled:opacity-40" type="button" onclick={redoDraftChange} disabled={redoCount === 0}>
      Redo
    </button>
    <span class="text-text-subtle">Cmd/Ctrl+Z | Cmd/Ctrl+Shift+Z | Ctrl+Y</span>
  </div>

  <div class="flex flex-wrap items-center gap-2">
    <form method="POST" action="?/bulkArchivePhotos">
      <input type="hidden" name="selected_photo_ids" value={selectedPhotoIds.join('\n')} />
      <button class="rounded border border-border-strong px-3 py-1 text-xs uppercase tracking-[0.14em]" type="submit" disabled={selectedPhotoIds.length === 0}>
        Archive Selected
      </button>
    </form>

    <form method="POST" action="?/bulkRestorePhotos">
      <input type="hidden" name="selected_photo_ids" value={selectedPhotoIds.join('\n')} />
      <button class="rounded border border-border-strong px-3 py-1 text-xs uppercase tracking-[0.14em]" type="submit" disabled={selectedPhotoIds.length === 0}>
        Restore Selected
      </button>
    </form>

    <form method="POST" action="?/bulkSetSearchable">
      <input type="hidden" name="selected_photo_ids" value={selectedPhotoIds.join('\n')} />
      <input type="hidden" name="searchable" value="true" />
      <button class="rounded border border-border-strong px-3 py-1 text-xs uppercase tracking-[0.14em]" type="submit" disabled={selectedPhotoIds.length === 0}>
        Set Searchable
      </button>
    </form>

    <form method="POST" action="?/bulkSetSearchable">
      <input type="hidden" name="selected_photo_ids" value={selectedPhotoIds.join('\n')} />
      <input type="hidden" name="searchable" value="false" />
      <button class="rounded border border-border-strong px-3 py-1 text-xs uppercase tracking-[0.14em]" type="submit" disabled={selectedPhotoIds.length === 0}>
        Unset Searchable
      </button>
    </form>
  </div>

  <PhotoTaxonomyEditor
    {categories}
    {tags}
    {taxonomyDraftCategories}
    {taxonomyDraftTags}
    {selectedPhotoIds}
    {categoryById}
    {tagById}
    {addTaxonomyDraft}
    {removeTaxonomyDraft}
    {clearTaxonomyDraft}
    {onTaxChipDragStart}
    {onTaxDragOver}
    {onTaxDrop}
    {onTaxDragEnd}
  />
</section>

