<script lang="ts">
  import { enhance } from '$app/forms';
  import AdminButton from '$lib/components/admin/AdminButton.svelte';
  import PhotoTaxonomyEditor from '$lib/components/admin/PhotoTaxonomyEditor.svelte';
  import type { AdminCategory, AdminTag } from '$lib/types/content';

  const {
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
    galleryScopeId = '',
    galleries = [],
    allowMove = false,
    showBulkTaxonomy = false,
    onToggleShowBulkTaxonomy,
    hideTaxonomyEditor = false,
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
    galleryScopeId?: string;
    galleries?: Array<{ id: string; slug: string; name: string }>;
    allowMove?: boolean;
    showBulkTaxonomy?: boolean;
    onToggleShowBulkTaxonomy?: () => void;
    hideTaxonomyEditor?: boolean;
  }>();

  let destinationGalleryId = $state('');
</script>

<section class="mt-4 grid gap-3">
  <div
    class="flex flex-wrap items-center gap-2 text-xs tracking-widest uppercase"
  >
    <span class="inline-block w-40 font-bold"
      >Selected photos: {selectedPhotoIds.length}</span
    >
    <AdminButton size="xs" type="button" onclick={selectAllVisiblePhotos}
      >Select all</AdminButton
    >
    <AdminButton size="xs" type="button" onclick={clearSelectedPhotos}
      >Clear</AdminButton
    >
  </div>

  <div class="flex flex-wrap items-center gap-2">
    {#if !showArchived}
      <form method="POST" action="?/bulkPublishPhotos">
        <input
          type="hidden"
          name="selected_photo_ids"
          value={selectedPhotoIds.join('\n')}
        />
        {#if galleryScopeId}
          <input type="hidden" name="gallery_id" value={galleryScopeId} />
        {/if}
        <AdminButton
          size="xs"
          type="submit"
          variant="submit"
          disabled={selectedPhotoIds.length === 0}
        >
          Publish Selected
        </AdminButton>
      </form>

      <form method="POST" action="?/bulkArchivePhotos" use:enhance>
        <input
          type="hidden"
          name="selected_photo_ids"
          value={selectedPhotoIds.join('\n')}
        />
        {#if galleryScopeId}
          <input type="hidden" name="gallery_id" value={galleryScopeId} />
        {/if}
        <AdminButton
          size="xs"
          type="submit"
          variant="danger"
          disabled={selectedPhotoIds.length === 0}
          onclick={(e: MouseEvent) => {
            if (
              !window.confirm(
                `Are you sure you want to archive the ${selectedPhotoIds.length} selected photo(s)?`,
              )
            ) {
              e.preventDefault();
            }
          }}
        >
          Archive Selected
        </AdminButton>
      </form>
    {:else}
      <form method="POST" action="?/bulkRestorePhotos" use:enhance>
        <input
          type="hidden"
          name="selected_photo_ids"
          value={selectedPhotoIds.join('\n')}
        />
        {#if galleryScopeId}
          <input type="hidden" name="gallery_id" value={galleryScopeId} />
        {/if}
        <AdminButton
          size="xs"
          type="submit"
          variant="submit"
          disabled={selectedPhotoIds.length === 0}
        >
          Restore Selected
        </AdminButton>
      </form>

      <form method="POST" action="?/bulkDeletePhotos" use:enhance>
        <input
          type="hidden"
          name="selected_photo_ids"
          value={selectedPhotoIds.join('\n')}
        />
        <input type="hidden" name="showArchived" value="1" />
        {#if galleryScopeId}
          <input type="hidden" name="gallery_id" value={galleryScopeId} />
        {/if}
        <AdminButton
          size="xs"
          type="submit"
          variant="danger"
          disabled={selectedPhotoIds.length === 0}
          onclick={(e: MouseEvent) => {
            if (
              !window.confirm(
                `Are you sure you want to permanently delete the ${selectedPhotoIds.length} selected photo(s) and all their files? This cannot be undone.`,
              )
            ) {
              e.preventDefault();
            }
          }}
        >
          Delete Selected
        </AdminButton>
      </form>
    {/if}

    {#if allowMove && galleries.length > 0}
      <form method="POST" action="?/bulkMovePhotos" class="ml-2 flex gap-2">
        <input
          type="hidden"
          name="selected_photo_ids"
          value={selectedPhotoIds.join('\n')}
        />
        <select
          name="destination_gallery_id"
          bind:value={destinationGalleryId}
          class="rounded border border-border-strong bg-surface px-2 py-1 text-xs"
        >
          <option value="">Move to...</option>
          {#each galleries as gallery (gallery.id)}
            <option value={gallery.id}>{gallery.name}</option>
          {/each}
        </select>
        <AdminButton
          size="xs"
          type="submit"
          variant="submit"
          disabled={selectedPhotoIds.length === 0 || !destinationGalleryId}
        >
          Move Selected
        </AdminButton>
      </form>
    {/if}

    {#if onToggleShowBulkTaxonomy}
      <label
        class="ml-auto flex cursor-pointer items-center gap-2 text-xs tracking-widest uppercase"
      >
        <input
          type="checkbox"
          checked={showBulkTaxonomy}
          onchange={onToggleShowBulkTaxonomy}
          class="rounded border-border"
        />
        Show Taxonomy
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
      {galleryScopeId}
      {categoryById}
      {tagById}
      {addTaxonomyDraft}
      {removeTaxonomyDraft}
    />
  {/if}
</section>
