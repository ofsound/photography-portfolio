<script lang="ts">
  import AdminButton from '$lib/components/admin/AdminButton.svelte';
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
  <div class="flex flex-wrap items-center gap-2 text-xs uppercase tracking-[var(--tracking-tight)]">
    <span>Selected photos: {selectedPhotoIds.length}</span>
    <AdminButton size="chip" type="button" onclick={selectAllVisiblePhotos}>Select all visible</AdminButton>
    <AdminButton size="chip" type="button" onclick={clearSelectedPhotos}>Clear</AdminButton>
    <AdminButton size="chip" type="button" onclick={undoDraftChange} disabled={undoCount === 0}>Undo</AdminButton>
    <AdminButton size="chip" type="button" onclick={redoDraftChange} disabled={redoCount === 0}>Redo</AdminButton>
    <span class="text-text-subtle">Cmd/Ctrl+Z | Cmd/Ctrl+Shift+Z | Ctrl+Y</span>
  </div>

  <div class="flex flex-wrap items-center gap-2">
    <form method="POST" action="?/bulkArchivePhotos">
      <input type="hidden" name="selected_photo_ids" value={selectedPhotoIds.join('\n')} />
      <AdminButton type="submit" disabled={selectedPhotoIds.length === 0}>Archive Selected</AdminButton>
    </form>

    <form method="POST" action="?/bulkRestorePhotos">
      <input type="hidden" name="selected_photo_ids" value={selectedPhotoIds.join('\n')} />
      <AdminButton type="submit" disabled={selectedPhotoIds.length === 0}>Restore Selected</AdminButton>
    </form>

    <form method="POST" action="?/bulkSetSearchable">
      <input type="hidden" name="selected_photo_ids" value={selectedPhotoIds.join('\n')} />
      <input type="hidden" name="searchable" value="true" />
      <AdminButton type="submit" disabled={selectedPhotoIds.length === 0}>Set Searchable</AdminButton>
    </form>

    <form method="POST" action="?/bulkSetSearchable">
      <input type="hidden" name="selected_photo_ids" value={selectedPhotoIds.join('\n')} />
      <input type="hidden" name="searchable" value="false" />
      <AdminButton type="submit" disabled={selectedPhotoIds.length === 0}>Unset Searchable</AdminButton>
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

