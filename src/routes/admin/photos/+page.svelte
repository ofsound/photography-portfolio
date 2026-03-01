<script lang="ts">
  import { invalidateAll } from '$app/navigation';
  import { onMount } from 'svelte';
  import { DragDropProvider, DragOverlay } from '@dnd-kit/svelte';
  import { createSortable } from '@dnd-kit/svelte/sortable';
  import { move } from '@dnd-kit/helpers';
  import AdminButton from '$lib/components/admin/AdminButton.svelte';
  import AdminPhotoCard from '$lib/components/admin/photos/AdminPhotoCard.svelte';
  import AdminPhotosBulkPanel from '$lib/components/admin/photos/AdminPhotosBulkPanel.svelte';
  import AdminPhotosFilterForm from '$lib/components/admin/photos/AdminPhotosFilterForm.svelte';
  import {
    clonePhotoDraftState,
    createPhotoDraftState,
    pushDraftHistory,
    redoDraftHistory,
    undoDraftHistory,
    type PhotoDraftState
  } from '$lib/components/admin/photos/page/history';
  import {
    addTaxonomyDraftId,
    clearTaxonomyDraftIds,
    removeTaxonomyDraftId,
    selectAllPhotoIds,
    toggleSelectedPhotoIds
  } from '$lib/components/admin/photos/page/selection';
  import {
    persistAdditionalOrder,
    persistPhotoOrder,
    persistTaxonomy
  } from '$lib/components/admin/photos/persist';
  import { getAdminPhotosPrefs, setAdminPhotosPrefs } from '$lib/stores/admin-photos-prefs';
  import { photoPublicUrl } from '$lib/utils/storage-url';
  import type { AdminCategory, AdminPhoto, AdminPhotoImage, AdminTag } from '$lib/types/content';

  let { data, form } = $props();

  const photos = $derived(data.photos as AdminPhoto[]);
  const categories = $derived(data.categories as AdminCategory[]);
  const tags = $derived(data.tags as AdminTag[]);

  const serverCategoryIds = (photoId: string) => data.photoCategoryIds[photoId] ?? [];
  const serverTagIds = (photoId: string) => data.photoTagIds[photoId] ?? [];
  const imagesForPhoto = (photoId: string) => (data.photoImageMap[photoId] ?? []) as AdminPhotoImage[];

  const baseAdditionalOrder = (photoId: string) =>
    imagesForPhoto(photoId)
      .filter((image) => image.kind === 'additional')
      .sort((a, b) => a.position - b.position)
      .map((image) => image.id);

  const categoryById = (id: string) => categories.find((category) => category.id === id) ?? null;
  const tagById = (id: string) => tags.find((tag) => tag.id === id) ?? null;

  let orderedAdditionalByPhoto = $state<Record<string, string[]>>({});
  let selectedCategoryIdsByPhoto = $state<Record<string, string[]>>({});
  let selectedTagIdsByPhoto = $state<Record<string, string[]>>({});
  let selectedPhotoIds = $state<string[]>([]);
  let taxonomyDraftCategories = $state<string[]>([]);
  let taxonomyDraftTags = $state<string[]>([]);
  let undoStack = $state<PhotoDraftState[]>([]);
  let redoStack = $state<PhotoDraftState[]>([]);

  let orderedPhotoIds = $state<string[]>([]);
  let showMeta = $state(false);

  const maxDensity = $derived((data as { maxDensity?: number }).maxDensity ?? 20);

  let density = $state(6);
  const gap = 8;
  let mounted = $state(false);

  const colCount = $derived(Math.max(1, Math.min(maxDensity, Number(density) || 6)));
  const sectionMaxWidthStyle = 'max-width: 100%;';

  onMount(() => {
    mounted = true;
    const prefs = getAdminPhotosPrefs(maxDensity);
    if (prefs) density = prefs.density;
  });

  const historyLimit = 100;

  const getDraftState = () =>
    createPhotoDraftState(orderedAdditionalByPhoto, taxonomyDraftCategories, taxonomyDraftTags);

  const applyDraftState = (state: PhotoDraftState) => {
    const cloned = clonePhotoDraftState(state);
    orderedAdditionalByPhoto = cloned.orderedAdditionalByPhoto;
    taxonomyDraftCategories = cloned.taxonomyDraftCategories;
    taxonomyDraftTags = cloned.taxonomyDraftTags;
  };

  const pushHistory = () => {
    const result = pushDraftHistory({
      undoStack,
      redoStack,
      currentState: getDraftState(),
      limit: historyLimit
    });
    undoStack = result.undoStack;
    redoStack = result.redoStack;
  };

  const undoDraftChange = () => {
    const result = undoDraftHistory({
      undoStack,
      redoStack,
      currentState: getDraftState(),
      limit: historyLimit
    });
    undoStack = result.undoStack;
    redoStack = result.redoStack;
    if (result.appliedState) applyDraftState(result.appliedState);
  };

  const redoDraftChange = () => {
    const result = redoDraftHistory({
      undoStack,
      redoStack,
      currentState: getDraftState(),
      limit: historyLimit
    });
    undoStack = result.undoStack;
    redoStack = result.redoStack;
    if (result.appliedState) applyDraftState(result.appliedState);
  };

  const isTypingTarget = (target: EventTarget | null) => {
    if (!(target instanceof HTMLElement)) return false;
    if (target.isContentEditable) return true;
    const tag = target.tagName.toLowerCase();
    return tag === 'input' || tag === 'textarea' || tag === 'select';
  };

  const onHistoryKeydown = (event: KeyboardEvent) => {
    if (isTypingTarget(event.target)) return;
    if (!event.metaKey && !event.ctrlKey) return;

    const key = event.key.toLowerCase();
    const redoCombo = (key === 'z' && event.shiftKey) || (key === 'y' && event.ctrlKey && !event.metaKey);
    if (redoCombo) {
      event.preventDefault();
      redoDraftChange();
      return;
    }

    if (key === 'z' && !event.shiftKey) {
      event.preventDefault();
      undoDraftChange();
    }
  };

  const photoById = $derived(new Map(photos.map((p) => [p.id, p])));

  $effect(() => {
    const nextOrder: Record<string, string[]> = {};
    const nextCategoryIds: Record<string, string[]> = {};
    const nextTagIds: Record<string, string[]> = {};

    for (const photo of photos) {
      nextOrder[photo.id] = baseAdditionalOrder(photo.id);
      nextCategoryIds[photo.id] = serverCategoryIds(photo.id);
      nextTagIds[photo.id] = serverTagIds(photo.id);
    }

    orderedAdditionalByPhoto = nextOrder;
    selectedCategoryIdsByPhoto = nextCategoryIds;
    selectedTagIdsByPhoto = nextTagIds;
    orderedPhotoIds = photos.map((p) => p.id);
    undoStack = [];
    redoStack = [];
  });

  $effect(() => {
    if (typeof window === 'undefined') return;
    window.addEventListener('keydown', onHistoryKeydown);
    return () => {
      window.removeEventListener('keydown', onHistoryKeydown);
    };
  });

  const additionalOrder = (photoId: string) => orderedAdditionalByPhoto[photoId] ?? baseAdditionalOrder(photoId);
  const selectedCategoryIds = (photoId: string) => selectedCategoryIdsByPhoto[photoId] ?? serverCategoryIds(photoId);
  const selectedTagIds = (photoId: string) => selectedTagIdsByPhoto[photoId] ?? serverTagIds(photoId);

  const onAdditionalReorder = async (photoId: string, next: string[]) => {
    orderedAdditionalByPhoto = { ...orderedAdditionalByPhoto, [photoId]: next };
    if (await persistAdditionalOrder(window.location.pathname, photoId, next)) {
      invalidateAll();
    }
  };

  const togglePhotoSelected = (photoId: string, checked: boolean) => {
    selectedPhotoIds = toggleSelectedPhotoIds(selectedPhotoIds, photoId, checked);
  };

  const selectAllVisiblePhotos = () => {
    selectedPhotoIds = selectAllPhotoIds(photos);
  };

  const clearSelectedPhotos = () => {
    selectedPhotoIds = [];
  };

  const photoConversionState = (photoId: string) => data.photoConversionStateMap[photoId] ?? 'no-images';

  const onTaxonomyChange = async (photoId: string, categoryIds: string[], tagIds: string[]) => {
    selectedCategoryIdsByPhoto = { ...selectedCategoryIdsByPhoto, [photoId]: categoryIds };
    selectedTagIdsByPhoto = { ...selectedTagIdsByPhoto, [photoId]: tagIds };
    if (await persistTaxonomy(window.location.pathname, photoId, categoryIds, tagIds)) {
      invalidateAll();
    }
  };

  const addTaxonomyDraft = (type: 'category' | 'tag', id: string) => {
    if (type === 'category') {
      const next = addTaxonomyDraftId(taxonomyDraftCategories, id);
      if (next === taxonomyDraftCategories) return;
      pushHistory();
      taxonomyDraftCategories = next;
      return;
    }

    const next = addTaxonomyDraftId(taxonomyDraftTags, id);
    if (next === taxonomyDraftTags) return;
    pushHistory();
    taxonomyDraftTags = next;
  };

  const removeTaxonomyDraft = (type: 'category' | 'tag', id: string) => {
    if (type === 'category') {
      const next = removeTaxonomyDraftId(taxonomyDraftCategories, id);
      if (next === taxonomyDraftCategories) return;
      pushHistory();
      taxonomyDraftCategories = next;
      return;
    }

    const next = removeTaxonomyDraftId(taxonomyDraftTags, id);
    if (next === taxonomyDraftTags) return;
    pushHistory();
    taxonomyDraftTags = next;
  };

  const clearTaxonomyDraft = () => {
    const cleared = clearTaxonomyDraftIds(taxonomyDraftCategories, taxonomyDraftTags);
    if (!cleared.changed) return;
    pushHistory();
    taxonomyDraftCategories = cleared.categories;
    taxonomyDraftTags = cleared.tags;
  };

  async function onPhotoDragEnd(event: unknown) {
    const next = move(orderedPhotoIds, event as Parameters<typeof move>[1]);
    if (next !== orderedPhotoIds) {
      orderedPhotoIds = next;
      if (await persistPhotoOrder(window.location.pathname, next)) {
        invalidateAll();
      }
    }
  }

  const updateDensity = (next: number) => {
    density = next;
    setAdminPhotosPrefs({ density }, maxDensity);
  };
</script>

<div class="flex items-baseline justify-between gap-4">
  <div class="flex items-baseline gap-3">
    <h1 class="text-xl uppercase tracking-[var(--tracking-heading)]">Photos</h1>
    {#if data.showArchived}
      <AdminButton size="sm" href="/admin/photos">Published only</AdminButton>
    {:else}
      <AdminButton size="sm" href="/admin/photos?showArchived=1">Archived only</AdminButton>
    {/if}
    <AdminButton size="sm" type="button" onclick={() => (showMeta = !showMeta)}>Toggle Meta</AdminButton>
  </div>
  <AdminButton href="/admin/photos/create" variant="success">Add New Photo</AdminButton>
</div>

{#if form?.message}
  <p class="mt-3 rounded border border-border px-3 py-2 text-sm">{form.message}</p>
{/if}

<AdminPhotosFilterForm
  q={data.q}
  {categories}
  {tags}
  filterCategoryId={data.filterCategoryId}
  filterTagId={data.filterTagId}
  showArchived={data.showArchived}
  densityVisible={mounted}
  densityColCount={colCount}
  densityMax={maxDensity}
  onDensityChange={updateDensity}
/>

{#if showMeta}
  <AdminPhotosBulkPanel
  {selectedPhotoIds}
  undoCount={undoStack.length}
  redoCount={redoStack.length}
  showArchived={data.showArchived}
  {categories}
  {tags}
  {taxonomyDraftCategories}
  {taxonomyDraftTags}
  {categoryById}
  {tagById}
  {addTaxonomyDraft}
  {removeTaxonomyDraft}
  {clearTaxonomyDraft}
  {selectAllVisiblePhotos}
  {clearSelectedPhotos}
  {undoDraftChange}
  {redoDraftChange}
/>
{/if}

<section class="mt-6">
  <div class="mx-auto w-full" style={sectionMaxWidthStyle}>
    <DragDropProvider onDragEnd={onPhotoDragEnd}>
      <ul class="grid" style="grid-template-columns: repeat({colCount}, minmax(0, 1fr)); gap: {gap}px;">
        {#each orderedPhotoIds as id, index (id)}
          {@const photo = photoById.get(id)}
          {#if photo}
            {@const sortable = createSortable({ id, index })}
            <li {@attach sortable.attach} class="cursor-move">
              <AdminPhotoCard
                index={index}
                {photo}
                editHref={`/admin/photos/edit/${photo.id}`}
                images={imagesForPhoto(photo.id)}
                {categories}
                {tags}
                {selectedPhotoIds}
                selectedCategoryIds={selectedCategoryIds(photo.id)}
                selectedTagIds={selectedTagIds(photo.id)}
                onTaxonomyChange={onTaxonomyChange}
                photoConversionState={photoConversionState(photo.id)}
                additionalOrder={additionalOrder(photo.id)}
                onTogglePhotoSelected={togglePhotoSelected}
                {onAdditionalReorder}
                gridMode={true}
                isDraggingPhoto={sortable.isDragging}
              />
            </li>
          {/if}
        {/each}
      </ul>

      <DragOverlay>
        {#snippet children(source)}
          {@const photo = photoById.get(String(source.id))}
          {#if photo}
            {@const lead = imagesForPhoto(photo.id).find((img) => img.kind === 'lead') ?? null}
            <div
              class="relative flex aspect-square w-40 flex-col overflow-hidden rounded border-2 border-primary bg-surface shadow-xl"
              role="presentation"
            >
              <div class="flex-1 overflow-hidden">
                {#if lead?.delivery_storage_path}
                  <img
                    src={photoPublicUrl(lead.delivery_storage_path, 400)}
                    alt={lead.alt_text ?? photo.title}
                    class="h-full w-full object-cover"
                  />
                {:else}
                  <div
                    class="grid h-full w-full place-items-center rounded bg-surface-muted text-[var(--text-chip)] uppercase text-text-muted"
                  >
                    {lead ? 'pending' : 'no lead'}
                  </div>
                {/if}
              </div>
              <div class="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-2 pb-2 pt-6">
                <p class="truncate text-xs font-medium uppercase text-white">{photo.title}</p>
                <p class="truncate text-[var(--text-chip)] text-white/80">/{photo.slug}</p>
              </div>
            </div>
          {/if}
        {/snippet}
      </DragOverlay>
    </DragDropProvider>
  </div>
</section>
