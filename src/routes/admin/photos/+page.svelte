<script lang="ts">
  import { invalidateAll } from '$app/navigation';
  import { onMount } from 'svelte';
  import { photoPublicUrl } from '$lib/utils/storage-url';
  import PhotoConversionBadge from '$lib/components/admin/PhotoConversionBadge.svelte';
  import PhotoTaxonomyEditor from '$lib/components/admin/PhotoTaxonomyEditor.svelte';
  import PhotoUploadZone from '$lib/components/admin/PhotoUploadZone.svelte';
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

  let pollTimer = $state<ReturnType<typeof setInterval> | null>(null);
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

  onMount(() => {
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

    if (data.pendingConversionCount > 0) {
      pollTimer = setInterval(async () => {
        refreshState = 'refreshing';
        await invalidateAll();
        refreshState = 'idle';
      }, 8000);
    }

    window.addEventListener('keydown', onHistoryKeydown);

    return () => {
      if (pollTimer) clearInterval(pollTimer);
      window.removeEventListener('keydown', onHistoryKeydown);
    };
  });

  const additionalOrder = (photoId: string) => orderedAdditionalByPhoto[photoId] ?? baseAdditionalOrder(photoId);
  const selectedAdditional = (photoId: string) => selectedAdditionalByPhoto[photoId] ?? [];

  const imageById = (photoId: string, imageId: string) =>
    imagesForPhoto(photoId).find((image) => image.id === imageId) ?? null;

  const leadImage = (photoId: string) => imagesForPhoto(photoId).find((image) => image.kind === 'lead') ?? null;

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

  const imageConversionState = (image: AdminPhotoImage): 'ready' | 'converting' | 'unknown' => {
    if (image.delivery_storage_path) return 'ready';
    if (image.source_storage_path) return 'converting';
    return 'unknown';
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
</script>

<h1 class="text-xl uppercase tracking-[0.15em]">Photos</h1>
<div class="mt-2 flex flex-wrap items-center gap-3 text-xs uppercase tracking-[0.12em]">
  <span class="rounded border border-black/10 px-2 py-1">Pending conversions: {data.pendingConversionCount}</span>
  {#if data.pendingConversionCount > 0}
    <span class="rounded border border-black/10 px-2 py-1">
      {refreshState === 'refreshing' ? 'Refreshing...' : 'Auto-refresh every 8s'}
    </span>
  {/if}
</div>

{#if form?.message}
  <p class="mt-3 rounded border border-black/10 px-3 py-2 text-sm">{form.message}</p>
{/if}

<form method="GET" class="mt-4 grid gap-3 rounded border border-black/10 p-3 lg:grid-cols-6 lg:items-end">
  <label class="grid gap-1 text-xs uppercase tracking-[0.12em] lg:col-span-2">
    Search
    <input name="q" value={data.q} placeholder="Search photos" class="rounded border border-black/20 px-3 py-2" />
  </label>

  <label class="grid gap-1 text-xs uppercase tracking-[0.12em]">
    Category
    <select name="category" class="rounded border border-black/20 px-3 py-2">
      <option value="">all</option>
      {#each categories as category (category.id)}
        <option value={category.id} selected={data.filterCategoryId === category.id}>{category.name}</option>
      {/each}
    </select>
  </label>

  <label class="grid gap-1 text-xs uppercase tracking-[0.12em]">
    Tag
    <select name="tag" class="rounded border border-black/20 px-3 py-2">
      <option value="">all</option>
      {#each tags as tag (tag.id)}
        <option value={tag.id} selected={data.filterTagId === tag.id}>{tag.name}</option>
      {/each}
    </select>
  </label>

  <label class="grid gap-1 text-xs uppercase tracking-[0.12em]">
    Conversion
    <select name="conversion" class="rounded border border-black/20 px-3 py-2">
      <option value="all" selected={data.filterConversion === 'all'}>all</option>
      <option value="pending" selected={data.filterConversion === 'pending'}>pending</option>
      <option value="ready" selected={data.filterConversion === 'ready'}>ready</option>
      <option value="mixed" selected={data.filterConversion === 'mixed'}>mixed</option>
      <option value="no-images" selected={data.filterConversion === 'no-images'}>no images</option>
    </select>
  </label>

  <div class="flex flex-wrap items-center gap-2">
    <label class="flex items-center gap-2 text-sm">
      <input type="checkbox" name="showArchived" value="1" checked={data.showArchived} /> Show archived
    </label>
    <button class="rounded border border-black/20 px-3 py-1 text-xs uppercase tracking-[0.14em]" type="submit">Apply</button>
  </div>
</form>

<section class="mt-4 grid gap-3 rounded border border-black/10 p-3">
  <div class="flex flex-wrap items-center gap-2 text-xs uppercase tracking-[0.12em]">
    <span>Selected photos: {selectedPhotoIds.length}</span>
    <button class="rounded border border-black/20 px-2 py-1" type="button" onclick={selectAllVisiblePhotos}>Select all visible</button>
    <button class="rounded border border-black/20 px-2 py-1" type="button" onclick={clearSelectedPhotos}>Clear</button>
    <button
      class="rounded border border-black/20 px-2 py-1 disabled:opacity-40"
      type="button"
      onclick={undoDraftChange}
      disabled={undoStack.length === 0}
    >
      Undo
    </button>
    <button
      class="rounded border border-black/20 px-2 py-1 disabled:opacity-40"
      type="button"
      onclick={redoDraftChange}
      disabled={redoStack.length === 0}
    >
      Redo
    </button>
    <span class="text-ink/60">Cmd/Ctrl+Z | Cmd/Ctrl+Shift+Z | Ctrl+Y</span>
  </div>

  <div class="flex flex-wrap items-center gap-2">
    <form method="POST" action="?/bulkArchivePhotos">
      <input type="hidden" name="selected_photo_ids" value={selectedPhotoIds.join('\n')} />
      <button class="rounded border border-black/20 px-3 py-1 text-xs uppercase tracking-[0.14em]" type="submit" disabled={selectedPhotoIds.length === 0}>Archive Selected</button>
    </form>

    <form method="POST" action="?/bulkRestorePhotos">
      <input type="hidden" name="selected_photo_ids" value={selectedPhotoIds.join('\n')} />
      <button class="rounded border border-black/20 px-3 py-1 text-xs uppercase tracking-[0.14em]" type="submit" disabled={selectedPhotoIds.length === 0}>Restore Selected</button>
    </form>

    <form method="POST" action="?/bulkSetSearchable">
      <input type="hidden" name="selected_photo_ids" value={selectedPhotoIds.join('\n')} />
      <input type="hidden" name="searchable" value="true" />
      <button class="rounded border border-black/20 px-3 py-1 text-xs uppercase tracking-[0.14em]" type="submit" disabled={selectedPhotoIds.length === 0}>Set Searchable</button>
    </form>

    <form method="POST" action="?/bulkSetSearchable">
      <input type="hidden" name="selected_photo_ids" value={selectedPhotoIds.join('\n')} />
      <input type="hidden" name="searchable" value="false" />
      <button class="rounded border border-black/20 px-3 py-1 text-xs uppercase tracking-[0.14em]" type="submit" disabled={selectedPhotoIds.length === 0}>Unset Searchable</button>
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

<section class="mt-6 grid gap-6 lg:grid-cols-[420px_1fr]">
  <form method="POST" action="?/create" class="grid gap-3 rounded border border-black/10 p-4">
    <h2 class="text-sm uppercase tracking-[0.14em]">Create Photo</h2>
    <input name="title" placeholder="Title" class="rounded border border-black/20 px-3 py-2" required />
    <input name="slug" placeholder="Slug (optional)" class="rounded border border-black/20 px-3 py-2" />
    <input name="capture_date" type="date" class="rounded border border-black/20 px-3 py-2" />
    <textarea name="description" rows="4" placeholder="Description" class="rounded border border-black/20 px-3 py-2"></textarea>
    <div class="grid gap-2 sm:grid-cols-2">
      <input name="width_px" type="number" placeholder="Width px" class="rounded border border-black/20 px-3 py-2" />
      <input name="height_px" type="number" placeholder="Height px" class="rounded border border-black/20 px-3 py-2" />
    </div>
    <textarea name="license_text" rows="2" placeholder="License text" class="rounded border border-black/20 px-3 py-2"></textarea>
    <input name="og_title" placeholder="OG title" class="rounded border border-black/20 px-3 py-2" />
    <textarea name="og_description" rows="2" placeholder="OG description" class="rounded border border-black/20 px-3 py-2"></textarea>
    <input name="og_image_path" placeholder="OG image path" class="rounded border border-black/20 px-3 py-2" />
    <label class="flex items-center gap-2 text-sm"><input type="checkbox" name="is_searchable" checked /> Searchable</label>
    <button class="w-fit rounded border border-black/20 px-3 py-1 text-xs uppercase tracking-[0.14em]" type="submit">Create Photo</button>
  </form>

  <div class="grid gap-4">
    {#each photos as photo (photo.id)}
      <article class="grid gap-3 rounded border border-black/10 p-4">
        <div class="flex items-center justify-between gap-3 rounded border border-black/10 px-3 py-2">
          <label class="flex items-center gap-2 text-xs uppercase tracking-[0.12em]">
            <input
              type="checkbox"
              checked={selectedPhotoIds.includes(photo.id)}
              onchange={(event) => togglePhotoSelected(photo.id, (event.currentTarget as HTMLInputElement).checked)}
            />
            Select Photo
          </label>
          <div class="flex items-center gap-2">
            <PhotoConversionBadge state={photoConversionState(photo.id)} />
            <span class="text-xs text-ink/70"><code>{photo.id}</code></span>
          </div>
        </div>

        <form method="POST" action="?/update" class="grid gap-3">
          <input type="hidden" name="id" value={photo.id} />
          <div class="grid gap-2 sm:grid-cols-3">
            <input name="title" value={photo.title} class="rounded border border-black/20 px-3 py-2" required />
            <input name="slug" value={photo.slug} class="rounded border border-black/20 px-3 py-2" required />
            <input name="capture_date" type="date" value={photo.capture_date ?? ''} class="rounded border border-black/20 px-3 py-2" />
          </div>

          <textarea name="description" rows="3" class="rounded border border-black/20 px-3 py-2">{photo.description ?? ''}</textarea>

          <div class="grid gap-2 sm:grid-cols-3">
            <input name="width_px" type="number" value={photo.width_px ?? ''} placeholder="Width" class="rounded border border-black/20 px-3 py-2" />
            <input name="height_px" type="number" value={photo.height_px ?? ''} placeholder="Height" class="rounded border border-black/20 px-3 py-2" />
            <label class="flex items-center gap-2 rounded border border-black/20 px-3 py-2 text-sm"><input type="checkbox" name="is_searchable" checked={photo.is_searchable} /> Searchable</label>
          </div>

          <textarea name="license_text" rows="2" class="rounded border border-black/20 px-3 py-2" placeholder="License text">{photo.license_text ?? ''}</textarea>
          <input name="og_title" value={photo.og_title ?? ''} class="rounded border border-black/20 px-3 py-2" placeholder="OG title" />
          <textarea name="og_description" rows="2" class="rounded border border-black/20 px-3 py-2" placeholder="OG description">{photo.og_description ?? ''}</textarea>
          <input name="og_image_path" value={photo.og_image_path ?? ''} class="rounded border border-black/20 px-3 py-2" placeholder="OG image path" />

          <div class="flex flex-wrap items-center gap-2">
            <button class="rounded border border-black/20 px-3 py-1 text-xs uppercase tracking-[0.14em]" type="submit">Save</button>
            <button class="rounded border border-black/20 px-3 py-1 text-xs uppercase tracking-[0.14em]" type="submit" formaction="?/archive">Archive</button>
            <button class="rounded border border-black/20 px-3 py-1 text-xs uppercase tracking-[0.14em]" type="submit" formaction="?/restore">Restore</button>
            <span class="text-xs text-ink/70">{photo.status}{#if photo.deleted_at} (archived){/if}</span>
          </div>
        </form>

        <form method="POST" action="?/saveRelations" class="grid gap-3 rounded border border-black/10 p-3">
          <input type="hidden" name="photo_id" value={photo.id} />
          <div class="grid gap-3 lg:grid-cols-2">
            <fieldset class="grid gap-2">
              <legend class="text-xs uppercase tracking-[0.12em]">Categories</legend>
              <div class="grid max-h-36 gap-1 overflow-auto">
                {#each categories as category (category.id)}
                  <label class="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      name="category_ids"
                      value={category.id}
                      checked={selectedCategoryIds(photo.id).includes(category.id)}
                    />
                    {category.name}
                  </label>
                {/each}
              </div>
            </fieldset>

            <fieldset class="grid gap-2">
              <legend class="text-xs uppercase tracking-[0.12em]">Tags</legend>
              <div class="grid max-h-36 gap-1 overflow-auto">
                {#each tags as tag (tag.id)}
                  <label class="flex items-center gap-2 text-sm">
                    <input type="checkbox" name="tag_ids" value={tag.id} checked={selectedTagIds(photo.id).includes(tag.id)} />
                    {tag.name}
                  </label>
                {/each}
              </div>
            </fieldset>
          </div>

          <button class="w-fit rounded border border-black/20 px-3 py-1 text-xs uppercase tracking-[0.14em]" type="submit">Save Taxonomy</button>
        </form>

        <PhotoUploadZone photoId={photo.id} />

        <div class="grid gap-3 rounded border border-black/10 p-3">
          <p class="text-xs uppercase tracking-[0.12em]">Images</p>

          {#if leadImage(photo.id)}
            {@const lead = leadImage(photo.id)!}
            <div class="grid gap-2 rounded border border-black/10 p-2 sm:grid-cols-[auto_1fr_auto] sm:items-center">
              {#if lead.delivery_storage_path}
                <img src={photoPublicUrl(lead.delivery_storage_path, 180)} alt={lead.alt_text ?? photo.title} class="h-12 w-16 rounded object-cover" />
              {:else}
                <div class="grid h-12 w-16 place-items-center rounded border border-black/20 text-[10px] uppercase">pending</div>
              {/if}

              <div class="text-xs">
                <div class="flex items-center gap-2 uppercase tracking-[0.12em]">
                  <span>Lead Image</span>
                  <PhotoConversionBadge state={imageConversionState(lead)} size="sm" />
                </div>
                <div><code>{lead.id}</code></div>
              </div>

              <form method="POST" action="?/removeImage">
                <input type="hidden" name="image_id" value={lead.id} />
                <button class="rounded border border-red-400/60 px-2 py-1 text-xs uppercase tracking-[0.12em] text-red-700" type="submit">Delete</button>
              </form>
            </div>
          {:else}
            <p class="text-sm text-ink/70">No lead image set.</p>
          {/if}

          <div class="grid gap-2">
            <p class="text-xs uppercase tracking-[0.12em]">Additional Images (drag to reorder)</p>

            {#if additionalOrder(photo.id).length === 0}
              <p class="text-sm text-ink/70">No additional images.</p>
            {:else}
              <ul class="grid gap-2" ondragover={onAdditionalDragOver} ondrop={(event) => onAdditionalDropToEnd(photo.id, event)}>
                {#each additionalOrder(photo.id) as imageId}
                  {@const image = imageById(photo.id, imageId)}
                  {#if image}
                    <li
                      class="grid cursor-move gap-2 rounded border border-black/10 p-2 sm:grid-cols-[auto_auto_1fr_auto_auto] sm:items-center"
                      draggable="true"
                      ondragstart={(event) => onAdditionalDragStart(photo.id, image.id, event)}
                      ondragover={onAdditionalDragOver}
                      ondrop={(event) => onAdditionalDropBefore(photo.id, image.id, event)}
                      ondragend={onAdditionalDragEnd}
                    >
                      <label class="flex items-center justify-center">
                        <input
                          type="checkbox"
                          checked={selectedAdditional(photo.id).includes(image.id)}
                          onchange={(event) =>
                            toggleAdditionalSelected(photo.id, image.id, (event.currentTarget as HTMLInputElement).checked)}
                        />
                      </label>

                      {#if image.delivery_storage_path}
                        <img src={photoPublicUrl(image.delivery_storage_path, 160)} alt={image.alt_text ?? photo.title} class="h-12 w-16 rounded object-cover" />
                      {:else}
                        <div class="grid h-12 w-16 place-items-center rounded border border-black/20 text-[10px] uppercase">pending</div>
                      {/if}

                      <div class="text-xs">
                        <div class="flex items-center gap-2">
                          <code>{image.id}</code>
                          <PhotoConversionBadge state={imageConversionState(image)} size="sm" />
                        </div>
                        <div>pos: {image.position}</div>
                      </div>

                      <form method="POST" action="?/setLead">
                        <input type="hidden" name="photo_id" value={photo.id} />
                        <input type="hidden" name="image_id" value={image.id} />
                        <button class="rounded border border-black/20 px-2 py-1 text-xs uppercase tracking-[0.12em]" type="submit">Set Lead</button>
                      </form>

                      <form method="POST" action="?/removeImage">
                        <input type="hidden" name="image_id" value={image.id} />
                        <button class="rounded border border-red-400/60 px-2 py-1 text-xs uppercase tracking-[0.12em] text-red-700" type="submit">Delete</button>
                      </form>
                    </li>
                  {/if}
                {/each}
              </ul>

              <div class="flex flex-wrap gap-2">
                <form method="POST" action="?/reorderAdditionalImages" class="w-fit">
                  <input type="hidden" name="photo_id" value={photo.id} />
                  <input type="hidden" name="ordered_image_ids" value={additionalOrder(photo.id).join('\n')} />
                  <button class="rounded border border-black/20 px-3 py-1 text-xs uppercase tracking-[0.14em]" type="submit">Save Additional Order</button>
                </form>

                <form method="POST" action="?/removeSelectedImages" class="w-fit">
                  <input type="hidden" name="photo_id" value={photo.id} />
                  <input type="hidden" name="selected_image_ids" value={selectedAdditional(photo.id).join('\n')} />
                  <button
                    class="rounded border border-red-400/60 px-3 py-1 text-xs uppercase tracking-[0.14em] text-red-700"
                    type="submit"
                    disabled={selectedAdditional(photo.id).length === 0}
                  >
                    Delete Selected Additional
                  </button>
                </form>
              </div>
            {/if}
          </div>
        </div>
      </article>
    {/each}
  </div>
</section>
