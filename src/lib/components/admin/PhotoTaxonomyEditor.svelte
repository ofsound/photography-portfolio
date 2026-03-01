<script lang="ts">
  import { DragDropProvider, DragOverlay, createDraggable, createDroppable } from '@dnd-kit/svelte';
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
    removeTaxonomyDraft,
    clearTaxonomyDraft
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
  }>();

  const draftDropZoneId = 'taxonomy-draft-drop';
  const draftDrop = createDroppable({ id: draftDropZoneId });

  const parseTaxonomyDragId = (rawId: string) => {
    if (rawId.startsWith('category:')) {
      return { type: 'category' as const, id: rawId.slice('category:'.length) };
    }
    if (rawId.startsWith('tag:')) {
      return { type: 'tag' as const, id: rawId.slice('tag:'.length) };
    }
    return null;
  };

  const onTaxonomyDragEnd = (event: unknown) => {
    const op = (event as { operation?: { source?: { id?: unknown }; target?: { id?: unknown } } })?.operation;
    if (!op?.source?.id || !op.target?.id) return;
    if (String(op.target.id) !== draftDropZoneId) return;
    const parsed = parseTaxonomyDragId(String(op.source.id));
    if (!parsed) return;
    addTaxonomyDraft(parsed.type, parsed.id);
  };

  const taxonomyLabelForDragId = (rawId: string) => {
    const parsed = parseTaxonomyDragId(rawId);
    if (!parsed) return null;
    if (parsed.type === 'category') {
      return {
        type: 'Category' as const,
        label: categoryById(parsed.id)?.name ?? parsed.id
      };
    }
    return {
      type: 'Tag' as const,
      label: tagById(parsed.id)?.name ?? parsed.id
    };
  };
</script>

<DragDropProvider onDragEnd={onTaxonomyDragEnd}>
  <div class="grid gap-3 rounded border border-border p-3 lg:grid-cols-3">
    <div class="grid gap-2">
      <p class="text-xs uppercase tracking-[var(--tracking-tight)]">Drag Category Chips</p>
      <div class="flex flex-wrap gap-2">
        {#each categories as category (category.id)}
          {@const draggable = createDraggable({ id: `category:${category.id}` })}
          <span {@attach draggable.attach} class="inline-flex" class:opacity-60={draggable.isDragging}>
            <AdminButton
              size="chip"
              type="button"
              onclick={() => addTaxonomyDraft('category', category.id)}
            >
              {category.name}
            </AdminButton>
          </span>
        {/each}
      </div>
    </div>

    <div class="grid gap-2">
      <p class="text-xs uppercase tracking-[var(--tracking-tight)]">Drag Tag Chips</p>
      <div class="flex flex-wrap gap-2">
        {#each tags as tag (tag.id)}
          {@const draggable = createDraggable({ id: `tag:${tag.id}` })}
          <span {@attach draggable.attach} class="inline-flex" class:opacity-60={draggable.isDragging}>
            <AdminButton
              size="chip"
              type="button"
              onclick={() => addTaxonomyDraft('tag', tag.id)}
            >
              {tag.name}
            </AdminButton>
          </span>
        {/each}
      </div>
    </div>

    <form
      method="POST"
      action="?/bulkAssignTaxonomy"
      class="grid gap-2 rounded border border-border-strong p-2"
      class:border-primary={draftDrop.isDropTarget}
      {@attach draftDrop.attach}
    >
      <input type="hidden" name="selected_photo_ids" value={selectedPhotoIds.join('\n')} />
      {#each taxonomyDraftCategories as categoryId (categoryId)}
        <input type="hidden" name="category_ids" value={categoryId} />
      {/each}
      {#each taxonomyDraftTags as tagId (tagId)}
        <input type="hidden" name="tag_ids" value={tagId} />
      {/each}

      <p class="text-xs uppercase tracking-[var(--tracking-tight)]">Drop Taxonomy Here</p>

      <div class="flex flex-wrap gap-2">
        {#each taxonomyDraftCategories as categoryId (categoryId)}
          {#if categoryById(categoryId)}
            <AdminButton variant="info" size="chip" type="button" onclick={() => removeTaxonomyDraft('category', categoryId)}>
              {categoryById(categoryId)?.name ?? categoryId} x
            </AdminButton>
          {/if}
        {/each}
        {#each taxonomyDraftTags as tagId (tagId)}
          {#if tagById(tagId)}
            <AdminButton variant="success-soft" size="chip" type="button" onclick={() => removeTaxonomyDraft('tag', tagId)}>
              {tagById(tagId)?.name ?? tagId} x
            </AdminButton>
          {/if}
        {/each}
      </div>

      <div class="flex flex-wrap items-center gap-2">
        <AdminButton size="chip" type="button" onclick={clearTaxonomyDraft}>Clear Draft</AdminButton>
        <AdminButton
          type="submit"
          disabled={selectedPhotoIds.length === 0 || (taxonomyDraftCategories.length === 0 && taxonomyDraftTags.length === 0)}
        >
          Apply Draft Taxonomy
        </AdminButton>
      </div>
    </form>
  </div>

  <DragOverlay>
    {#snippet children(source)}
      {@const dragTaxonomy = taxonomyLabelForDragId(String(source.id))}
      {#if dragTaxonomy}
        <div
          class="inline-flex items-center gap-2 rounded border-2 border-primary bg-surface px-3 py-2 shadow-xl"
          role="presentation"
        >
          <span class="text-[10px] uppercase tracking-[var(--tracking-tight)] text-text-muted">{dragTaxonomy.type}</span>
          <span class="text-xs uppercase tracking-[var(--tracking-tight)]">{dragTaxonomy.label}</span>
        </div>
      {/if}
    {/snippet}
  </DragOverlay>
</DragDropProvider>
