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
  import { getAdminPhotosPrefs, setAdminPhotosPrefs } from '$lib/stores/admin-photos-prefs';
  import { photoPublicUrl } from '$lib/utils/storage-url';
  import type { AdminCategory, AdminPhoto, AdminPhotoImage, AdminTag } from '$lib/types/content';

  const UNIFORM_RATIO = 1;

  async function persistAdditionalOrder(photoId: string, orderedIds: string[]) {
    const formData = new FormData();
    formData.append('photo_id', photoId);
    formData.append('ordered_image_ids', orderedIds.join('\n'));
    const res = await fetch(`${window.location.pathname}?/reorderAdditionalImages`, {
      method: 'POST',
      body: formData
    });
    if (res.ok) invalidateAll();
  }

  async function persistTaxonomy(photoId: string, categoryIds: string[], tagIds: string[]) {
    const formData = new FormData();
    formData.append('photo_id', photoId);
    for (const id of categoryIds) formData.append('category_ids', id);
    for (const id of tagIds) formData.append('tag_ids', id);
    const res = await fetch(`${window.location.pathname}?/saveRelations`, {
      method: 'POST',
      body: formData
    });
    if (res.ok) invalidateAll();
  }

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

  let dragging = $state<{ photoId: string; imageId: string } | null>(null);
  let draggingTaxonomy = $state<{ type: 'category' | 'tag'; id: string } | null>(null);
  let orderedPhotoIds = $state<string[]>([]);
  let showSearch = $state(false);
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

    const next = moveItem(current, from, to);
    orderedAdditionalByPhoto = { ...orderedAdditionalByPhoto, [photoId]: next };
    persistAdditionalOrder(photoId, next);
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

    orderedAdditionalByPhoto = { ...orderedAdditionalByPhoto, [photoId]: next };
    persistAdditionalOrder(photoId, next);
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

  const photoConversionState = (photoId: string) => data.photoConversionStateMap[photoId] ?? 'no-images';

  const onTaxonomyChange = (photoId: string, categoryIds: string[], tagIds: string[]) => {
    selectedCategoryIdsByPhoto = { ...selectedCategoryIdsByPhoto, [photoId]: categoryIds };
    selectedTagIdsByPhoto = { ...selectedTagIdsByPhoto, [photoId]: tagIds };
    persistTaxonomy(photoId, categoryIds, tagIds);
  };

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

  async function persistPhotoOrder(orderedIds: string[]) {
    const formData = new FormData();
    formData.append('ordered_photo_ids', orderedIds.join('\n'));
    const res = await fetch(`${window.location.pathname}?/reorderPhotos`, {
      method: 'POST',
      body: formData
    });
    if (res.ok) invalidateAll();
  }

  function onPhotoDragEnd(event: unknown) {
    const next = move(orderedPhotoIds, event as Parameters<typeof move>[1]);
    if (next !== orderedPhotoIds) {
      orderedPhotoIds = next;
      persistPhotoOrder(next);
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
    <AdminButton size="sm" type="button" onclick={() => (showSearch = !showSearch)}>Toggle Search</AdminButton>
    <AdminButton size="sm" type="button" onclick={() => (showMeta = !showMeta)}>Toggle Meta</AdminButton>
  </div>
  <AdminButton href="/admin/photos/create" variant="success">Add New Photo</AdminButton>
</div>

{#if form?.message}
  <p class="mt-3 rounded border border-border px-3 py-2 text-sm">{form.message}</p>
{/if}

{#if showSearch}
  <AdminPhotosFilterForm
    q={data.q}
    {categories}
    {tags}
    filterCategoryId={data.filterCategoryId}
    filterTagId={data.filterTagId}
    filterConversion={data.filterConversion as 'all' | 'pending' | 'ready' | 'mixed' | 'no-images'}
    showArchived={data.showArchived}
  />
{/if}

{#if showMeta}
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
{/if}

<section class="mt-6">
  <h2 class="text-sm uppercase tracking-[var(--tracking-label)]">Existing Photos</h2>
  <p class="mt-1 text-xs uppercase tracking-[var(--tracking-tight)] text-text-subtle">Click a photo to open it for editing. Drag to reorder.</p>

  {#if mounted}
    <div
      class="sticky top-[var(--sticky-offset)] z-20 mb-4 mt-3 ml-auto w-fit flex items-center rounded border border-border bg-surface px-3 py-2 text-xs uppercase tracking-[var(--tracking-heading)]"
    >
      <label class="flex items-center gap-2">
        Density
        <input
          type="range"
          min="1"
          max={String(maxDensity)}
          value={colCount}
          oninput={(e) => updateDensity(Number((e.currentTarget as HTMLInputElement).value))}
        />
        <span class="tabular-nums">{colCount}</span>
      </label>
    </div>
  {/if}

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
                {onAdditionalDragStart}
                {onAdditionalDragOver}
                {onAdditionalDropBefore}
                {onAdditionalDropToEnd}
                {onAdditionalDragEnd}
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
