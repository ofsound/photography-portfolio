<script lang="ts">
  import AdminButton from '$lib/components/admin/AdminButton.svelte';
  import PhotoTaxonomyEditor from '$lib/components/admin/PhotoTaxonomyEditor.svelte';
  import type { AdminCategory, AdminTag } from '$lib/types/content';

  let {
    selectedPhotoIds,
    undoCount,
    redoCount,
    showArchived = false,
    categories,
    tags,
    taxonomyDraftCategories,
    taxonomyDraftTags,
    categoryById,
    tagById,
    addTaxonomyDraft,
    removeTaxonomyDraft,
    clearTaxonomyDraft,
    selectAllVisiblePhotos,
    clearSelectedPhotos,
    undoDraftChange,
    redoDraftChange
  } = $props<{
    selectedPhotoIds: string[];
    undoCount: number;
    redoCount: number;
    showArchived?: boolean;
    categories: AdminCategory[];
    tags: AdminTag[];
    taxonomyDraftCategories: string[];
    taxonomyDraftTags: string[];
    categoryById: (id: string) => AdminCategory | null;
    tagById: (id: string) => AdminTag | null;
    addTaxonomyDraft: (type: 'category' | 'tag', id: string) => void;
    removeTaxonomyDraft: (type: 'category' | 'tag', id: string) => void;
    clearTaxonomyDraft: () => void;
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
    <form method="POST" action="?/bulkPublishPhotos">
      <input type="hidden" name="selected_photo_ids" value={selectedPhotoIds.join('\n')} />
      <AdminButton type="submit" disabled={selectedPhotoIds.length === 0}>Publish Selected</AdminButton>
    </form>

    <form method="POST" action="?/bulkArchivePhotos">
      <input type="hidden" name="selected_photo_ids" value={selectedPhotoIds.join('\n')} />
      <AdminButton type="submit" disabled={selectedPhotoIds.length === 0}>Archive Selected</AdminButton>
    </form>

    <form method="POST" action="?/bulkRestorePhotos">
      <input type="hidden" name="selected_photo_ids" value={selectedPhotoIds.join('\n')} />
      <AdminButton type="submit" disabled={selectedPhotoIds.length === 0}>Restore Selected</AdminButton>
    </form>

    {#if showArchived}
      <form
        method="POST"
        action="?/bulkDeletePhotos"
        onsubmit={(e) => {
          if (
            selectedPhotoIds.length > 0 &&
            !confirm(
              `Permanently delete ${selectedPhotoIds.length} photo(s) and all their files? This cannot be undone.`
            )
          ) {
            e.preventDefault();
          }
        }}
      >
        <input type="hidden" name="selected_photo_ids" value={selectedPhotoIds.join('\n')} />
        <input type="hidden" name="showArchived" value="1" />
        <AdminButton type="submit" variant="danger-outline" disabled={selectedPhotoIds.length === 0}>
          Delete Selected
        </AdminButton>
      </form>
    {/if}
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
  />
</section>
