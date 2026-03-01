<script lang="ts">
  import AdminButton from '$lib/components/admin/AdminButton.svelte';
  import PhotoTaxonomyEditor from '$lib/components/admin/PhotoTaxonomyEditor.svelte';
  import type { AdminCategory, AdminTag } from '$lib/types/content';

  let {
    selectedPhotoIds,
    showArchived = false,
    categories,
    tags,
    taxonomyDraftCategories,
    taxonomyDraftTags,
    categoryById,
    tagById,
    addTaxonomyDraft,
    removeTaxonomyDraft,
    selectAllVisiblePhotos,
    clearSelectedPhotos,
    showBulkTaxonomy = true,
    onToggleShowBulkTaxonomy,
    hideTaxonomyEditor = false
  } = $props<{
    selectedPhotoIds: string[];
    showArchived?: boolean;
    categories: AdminCategory[];
    tags: AdminTag[];
    taxonomyDraftCategories: string[];
    taxonomyDraftTags: string[];
    categoryById: (id: string) => AdminCategory | null;
    tagById: (id: string) => AdminTag | null;
    addTaxonomyDraft: (type: 'category' | 'tag', id: string) => void;
    removeTaxonomyDraft: (type: 'category' | 'tag', id: string) => void;
    selectAllVisiblePhotos: () => void;
    clearSelectedPhotos: () => void;
    showBulkTaxonomy?: boolean;
    onToggleShowBulkTaxonomy?: () => void;
    hideTaxonomyEditor?: boolean;
  }>();
</script>

<section class="mt-4 grid gap-3">
  <div class="flex flex-wrap items-center gap-2 text-xs uppercase tracking-[var(--tracking-tight)]">
    <span>Selected photos: {selectedPhotoIds.length}</span>
    <AdminButton size="xs" type="button" onclick={selectAllVisiblePhotos}>Select all visible</AdminButton>
    <AdminButton size="xs" type="button" onclick={clearSelectedPhotos}>Clear</AdminButton>
  </div>

  <div class="flex flex-wrap items-center gap-2">
    <form method="POST" action="?/bulkPublishPhotos">
      <input type="hidden" name="selected_photo_ids" value={selectedPhotoIds.join('\n')} />
      <AdminButton size="xs" type="submit" disabled={selectedPhotoIds.length === 0}>Publish Selected</AdminButton>
    </form>

    <form method="POST" action="?/bulkArchivePhotos">
      <input type="hidden" name="selected_photo_ids" value={selectedPhotoIds.join('\n')} />
      <AdminButton size="xs" type="submit" disabled={selectedPhotoIds.length === 0}>Archive Selected</AdminButton>
    </form>

    <form method="POST" action="?/bulkRestorePhotos">
      <input type="hidden" name="selected_photo_ids" value={selectedPhotoIds.join('\n')} />
      <AdminButton size="xs" type="submit" disabled={selectedPhotoIds.length === 0}>Restore Selected</AdminButton>
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
        <AdminButton size="xs" type="submit" variant="danger-outline" disabled={selectedPhotoIds.length === 0}>
          Delete Selected
        </AdminButton>
      </form>
    {/if}

    {#if onToggleShowBulkTaxonomy}
      <label class="ml-auto flex cursor-pointer items-center gap-2 text-xs uppercase tracking-[var(--tracking-tight)]">
        <input type="checkbox" checked={showBulkTaxonomy} onchange={onToggleShowBulkTaxonomy} class="rounded border-border" />
        Show Bulk Taxonomy
      </label>
    {/if}
  </div>

  {#if !hideTaxonomyEditor}
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
  />
  {/if}
</section>
