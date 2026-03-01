<script lang="ts">
  import AdminButton from '$lib/components/admin/AdminButton.svelte';
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
    removeTaxonomyDraft
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
  }>();
</script>

<div class="flex flex-col gap-4 rounded border border-border p-3">
  <div class="grid items-start gap-3 lg:grid-cols-2">
    <div class="grid gap-2">
      <div class="flex flex-wrap gap-2">
        {#each categories as category (category.id)}
          <AdminButton
            size="sm"
            variant="info"
            type="button"
            onclick={() => addTaxonomyDraft('category', category.id)}
          >
            {category.name} <span class="text-[10px] opacity-60">+</span>
          </AdminButton>
        {/each}
      </div>
    </div>

    <div class="grid gap-2">
      <div class="flex flex-wrap gap-2">
        {#each tags as tag (tag.id)}
          <AdminButton
            size="sm"
            variant="success-soft"
            type="button"
            onclick={() => addTaxonomyDraft('tag', tag.id)}
          >
            {tag.name} <span class="text-[10px] opacity-60">+</span>
          </AdminButton>
        {/each}
      </div>
    </div>
  </div>

  <form
    method="POST"
    action="?/bulkAssignTaxonomy"
    class="grid w-full gap-2"
  >
    <input type="hidden" name="selected_photo_ids" value={selectedPhotoIds.join('\n')} />
    {#each taxonomyDraftCategories as categoryId (categoryId)}
      <input type="hidden" name="category_ids" value={categoryId} />
    {/each}
    {#each taxonomyDraftTags as tagId (tagId)}
      <input type="hidden" name="tag_ids" value={tagId} />
    {/each}

    <div class="grid gap-2 rounded border border-border-strong p-2">
      <div class="flex flex-wrap gap-2">
        {#each taxonomyDraftCategories as categoryId (categoryId)}
          {#if categoryById(categoryId)}
            <AdminButton variant="info" size="xs" type="button" onclick={() => removeTaxonomyDraft('category', categoryId)}>
              {categoryById(categoryId)?.name ?? categoryId} x
            </AdminButton>
          {/if}
        {/each}
        {#each taxonomyDraftTags as tagId (tagId)}
          {#if tagById(tagId)}
            <AdminButton variant="success-soft" size="xs" type="button" onclick={() => removeTaxonomyDraft('tag', tagId)}>
              {tagById(tagId)?.name ?? tagId} x
            </AdminButton>
          {/if}
        {/each}

        {#if taxonomyDraftCategories.length === 0 && taxonomyDraftTags.length === 0}
          <span class="text-xs italic text-text-muted/50">Empty</span>
        {/if}
      </div>
    </div>

    <AdminButton
      size="xs"
      type="submit"
      disabled={selectedPhotoIds.length === 0 || (taxonomyDraftCategories.length === 0 && taxonomyDraftTags.length === 0)}
    >
      Apply To Selected
    </AdminButton>
  </form>
</div>
