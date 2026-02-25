<script lang="ts">
  import { invalidateAll } from '$app/navigation';
  import AdminPhotoCard from '$lib/components/admin/photos/AdminPhotoCard.svelte';
  import AdminPhotosBulkPanel from '$lib/components/admin/photos/AdminPhotosBulkPanel.svelte';
  import AdminPhotosFilterForm from '$lib/components/admin/photos/AdminPhotosFilterForm.svelte';
  import type { AdminCategory, AdminPhoto, AdminPhotoImage, AdminTag } from '$lib/types/content';

  let { data, form } = $props();

  const photos = $derived(data.photos as AdminPhoto[]);
  const categories = $derived(data.categories as AdminCategory[]);
  const tags = $derived(data.tags as AdminTag[]);

  const selectedCategoryIds = (photoId: string) => data.photoCategoryIds[photoId] ?? [];
  const selectedTagIds = (photoId: string) => data.photoTagIds[photoId] ?? [];
  const imagesForPhoto = (photoId: string) => (data.photoImageMap[photoId] ?? []) as AdminPhotoImage[];

  const baseAdditionalOrder = (photoId: string) =>
    imagesForPhoto(photoId)
      .filter((image) => image.kind === 'additional')
      .sort((a, b) => a.position - b.position)
      .map((image) => image.id);

  const categoryById = (id: string) => categories.find((category) => category.id === id) ?? null;
  const tagById = (id: string) => tags.find((tag) => tag.id === id) ?? null;

  let orderedAdditionalByPhoto = $state<Record<string, string[]>>({});
  let selectedAdditionalByPhoto = $state<Record<string, string[]>>({});
  let selectedPhotoIds = $state<string[]>([]);
  let taxonomyDraftCategories = $state<string[]>([]);
  let taxonomyDraftTags = $state<string[]>([]);
  let undoStack = $state<PhotoDraftState[]>([]);
  let redoStack = $state<PhotoDraftState[]>([]);

  let dragging = $state<{ photoId: string; imageId: string } | null>(null);
  let draggingTaxonomy = $state<{ type: 'category' | 'tag'; id: string } | null>(null);

  let refreshState = $state<'idle' | 'refreshing'>('idle');
  const historyLimit = 100;

  type PhotoDraftState = {
    orderedAdditionalByPhoto: Record<string, string[]>;
    taxonomyDraftCategories: string[];
    taxonomyDraftTags: string[];
  };

  const cloneOrderedAdditional = (state: Record<string, string[]>) =>
    Object.fromEntries(Object.entries(state).map(([photoId, imageIds]) => [photoId, [...imageIds]]));

  const getDraftState = (): PhotoDraftState => ({
    orderedAdditionalByPhoto: cloneOrderedAdditional(orderedAdditionalByPhoto),
    taxonomyDraftCategories: [...taxonomyDraftCategories],
    taxonomyDraftTags: [...taxonomyDraftTags]
  });

  const applyDraftState = (state: PhotoDraftState) => {
    orderedAdditionalByPhoto = cloneOrderedAdditional(state.orderedAdditionalByPhoto);
    taxonomyDraftCategories = [...state.taxonomyDraftCategories];
    taxonomyDraftTags = [...state.taxonomyDraftTags];
  };

  const pushHistory = () => {
    undoStack = [...undoStack, getDraftState()].slice(-historyLimit);
    redoStack = [];
  };

  const undoDraftChange = () => {
    if (undoStack.length === 0) return;

    const previous = undoStack[undoStack.length - 1];
    undoStack = undoStack.slice(0, -1);
    redoStack = [...redoStack, getDraftState()].slice(-historyLimit);
    applyDraftState(previous);
  };

  const redoDraftChange = () => {
    if (redoStack.length === 0) return;

    const next = redoStack[redoStack.length - 1];
    redoStack = redoStack.slice(0, -1);
    undoStack = [...undoStack, getDraftState()].slice(-historyLimit);
    applyDraftState(next);
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

  $effect(() => {
    const nextOrder: Record<string, string[]> = {};
    const nextSelected: Record<string, string[]> = {};

    for (const photo of photos) {
      nextOrder[photo.id] = baseAdditionalOrder(photo.id);
      nextSelected[photo.id] = [];
    }

    orderedAdditionalByPhoto = nextOrder;
    selectedAdditionalByPhoto = nextSelected;
    undoStack = [];
    redoStack = [];
  });

  $effect(() => {
    if (typeof window === 'undefined') return;
    if (data.pendingConversionCount <= 0) {
      refreshState = 'idle';
      return;
    }

    const timer = setInterval(async () => {
      refreshState = 'refreshing';
      await invalidateAll();
      refreshState = 'idle';
    }, 8000);

    return () => clearInterval(timer);
  });

  $effect(() => {
    if (typeof window === 'undefined') return;
    window.addEventListener('keydown', onHistoryKeydown);
    return () => {
      window.removeEventListener('keydown', onHistoryKeydown);
    };
  });

  const additionalOrder = (photoId: string) => orderedAdditionalByPhoto[photoId] ?? baseAdditionalOrder(photoId);
  const selectedAdditional = (photoId: string) => selectedAdditionalByPhoto[photoId] ?? [];

  const moveItem = (arr: string[], from: number, to: number) => {
    const clone = [...arr];
    const [item] = clone.splice(from, 1);
    clone.splice(to, 0, item);
    return clone;
  };

  const onAdditionalDragStart = (photoId: string, imageId: string, event: DragEvent) => {
    dragging = { photoId, imageId };
    event.dataTransfer?.setData('text/plain', imageId);
    if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move';
  };

  const onAdditionalDragOver = (event: DragEvent) => {
    event.preventDefault();
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
  };

  const onAdditionalDropBefore = (photoId: string, targetId: string, event: DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    if (!dragging || dragging.photoId !== photoId) return;

    const current = additionalOrder(photoId);
    const from = current.indexOf(dragging.imageId);
    const to = current.indexOf(targetId);
    if (from < 0 || to < 0 || from === to) return;

    pushHistory();
    orderedAdditionalByPhoto = {
      ...orderedAdditionalByPhoto,
      [photoId]: moveItem(current, from, to)
    };
  };

  const onAdditionalDropToEnd = (photoId: string, event: DragEvent) => {
    event.preventDefault();
    if (!dragging || dragging.photoId !== photoId) return;

    const current = additionalOrder(photoId);
    const from = current.indexOf(dragging.imageId);
    if (from < 0) return;

    const next = [...current];
    const [item] = next.splice(from, 1);
    next.push(item);

    pushHistory();
    orderedAdditionalByPhoto = {
      ...orderedAdditionalByPhoto,
      [photoId]: next
    };
  };

  const onAdditionalDragEnd = () => {
    dragging = null;
  };

  const togglePhotoSelected = (photoId: string, checked: boolean) => {
    if (checked) {
      if (selectedPhotoIds.includes(photoId)) return;
      selectedPhotoIds = [...selectedPhotoIds, photoId];
      return;
    }
    selectedPhotoIds = selectedPhotoIds.filter((id) => id !== photoId);
  };

  const selectAllVisiblePhotos = () => {
    selectedPhotoIds = photos.map((photo) => photo.id);
  };

  const clearSelectedPhotos = () => {
    selectedPhotoIds = [];
  };

  const toggleAdditionalSelected = (photoId: string, imageId: string, checked: boolean) => {
    const current = selectedAdditional(photoId);
    if (checked) {
      if (current.includes(imageId)) return;
      selectedAdditionalByPhoto = {
        ...selectedAdditionalByPhoto,
        [photoId]: [...current, imageId]
      };
      return;
    }

    selectedAdditionalByPhoto = {
      ...selectedAdditionalByPhoto,
      [photoId]: current.filter((id) => id !== imageId)
    };
  };

  const photoConversionState = (photoId: string) => data.photoConversionStateMap[photoId] ?? 'no-images';

  const addTaxonomyDraft = (type: 'category' | 'tag', id: string) => {
    if (type === 'category') {
      if (taxonomyDraftCategories.includes(id)) return;
      pushHistory();
      taxonomyDraftCategories = [...taxonomyDraftCategories, id];
      return;
    }

    if (taxonomyDraftTags.includes(id)) return;
    pushHistory();
    taxonomyDraftTags = [...taxonomyDraftTags, id];
  };

  const removeTaxonomyDraft = (type: 'category' | 'tag', id: string) => {
    if (type === 'category') {
      if (!taxonomyDraftCategories.includes(id)) return;
      pushHistory();
      taxonomyDraftCategories = taxonomyDraftCategories.filter((item) => item !== id);
      return;
    }

    if (!taxonomyDraftTags.includes(id)) return;
    pushHistory();
    taxonomyDraftTags = taxonomyDraftTags.filter((item) => item !== id);
  };

  const clearTaxonomyDraft = () => {
    if (taxonomyDraftCategories.length === 0 && taxonomyDraftTags.length === 0) return;
    pushHistory();
    taxonomyDraftCategories = [];
    taxonomyDraftTags = [];
  };

  const onTaxChipDragStart = (type: 'category' | 'tag', id: string, event: DragEvent) => {
    draggingTaxonomy = { type, id };
    event.dataTransfer?.setData('text/plain', `${type}:${id}`);
    if (event.dataTransfer) event.dataTransfer.effectAllowed = 'copy';
  };

  const onTaxDrop = (event: DragEvent) => {
    event.preventDefault();
    if (!draggingTaxonomy) return;

    addTaxonomyDraft(draggingTaxonomy.type, draggingTaxonomy.id);
    draggingTaxonomy = null;
  };

  const onTaxDragOver = (event: DragEvent) => {
    event.preventDefault();
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy';
  };

  const onTaxDragEnd = () => {
    draggingTaxonomy = null;
  };
</script>

<h1 class="text-xl uppercase tracking-[0.15em]">Photos</h1>
<div class="mt-3">
  <a href="/admin/photos/create" class="inline-flex rounded border border-border-strong px-3 py-1 text-xs uppercase tracking-[0.14em]">Create Photo</a>
</div>
<div class="mt-2 flex flex-wrap items-center gap-3 text-xs uppercase tracking-[0.12em]">
  <span class="rounded border border-border px-2 py-1">Pending conversions: {data.pendingConversionCount}</span>
  {#if data.pendingConversionCount > 0}
    <span class="rounded border border-border px-2 py-1">
      {refreshState === 'refreshing' ? 'Refreshing...' : 'Auto-refresh every 8s'}
    </span>
  {/if}
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
  filterConversion={data.filterConversion as 'all' | 'pending' | 'ready' | 'mixed' | 'no-images'}
  showArchived={data.showArchived}
/>

<AdminPhotosBulkPanel
  {selectedPhotoIds}
  undoCount={undoStack.length}
  redoCount={redoStack.length}
  {categories}
  {tags}
  {taxonomyDraftCategories}
  {taxonomyDraftTags}
  {categoryById}
  {tagById}
  {addTaxonomyDraft}
  {removeTaxonomyDraft}
  {clearTaxonomyDraft}
  {onTaxChipDragStart}
  {onTaxDragOver}
  {onTaxDrop}
  {onTaxDragEnd}
  {selectAllVisiblePhotos}
  {clearSelectedPhotos}
  {undoDraftChange}
  {redoDraftChange}
/>

<section class="mt-6">
  <h2 class="text-sm uppercase tracking-[0.14em]">Existing Photos</h2>
  <p class="mt-1 text-xs uppercase tracking-[0.12em] text-text-subtle">Cards are collapsed by default. Click Edit to expand.</p>

  <div class="mt-3 grid gap-4">
    {#each photos as photo (photo.id)}
      <AdminPhotoCard
        {photo}
        images={imagesForPhoto(photo.id)}
        {categories}
        {tags}
        {selectedPhotoIds}
        selectedCategoryIds={selectedCategoryIds(photo.id)}
        selectedTagIds={selectedTagIds(photo.id)}
        photoConversionState={photoConversionState(photo.id)}
        additionalOrder={additionalOrder(photo.id)}
        selectedAdditional={selectedAdditional(photo.id)}
        onTogglePhotoSelected={togglePhotoSelected}
        onToggleAdditionalSelected={toggleAdditionalSelected}
        {onAdditionalDragStart}
        {onAdditionalDragOver}
        {onAdditionalDropBefore}
        {onAdditionalDropToEnd}
        {onAdditionalDragEnd}
      />
    {/each}
  </div>
</section>
