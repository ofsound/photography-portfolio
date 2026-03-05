<script lang="ts">
  import { invalidateAll } from '$app/navigation';
  import { onMount } from 'svelte';
  import { DragDropProvider, DragOverlay } from '@dnd-kit/svelte';
  import { createSortable, isSortable } from '@dnd-kit/svelte/sortable';
  import AdminButton from '$lib/components/admin/AdminButton.svelte';
  import AdminHeading from '$lib/components/admin/AdminHeading.svelte';
  import AdminPhotoCard from '$lib/components/admin/photos/AdminPhotoCard.svelte';
  import AdminPhotosBulkPanel from '$lib/components/admin/photos/AdminPhotosBulkPanel.svelte';
  import AdminPhotosFilterForm from '$lib/components/admin/photos/AdminPhotosFilterForm.svelte';
  import PhotoTaxonomyEditor from '$lib/components/admin/PhotoTaxonomyEditor.svelte';
  import {
    addTaxonomyDraftId,
    removeTaxonomyDraftId,
    selectAllPhotoIds,
    toggleSelectedPhotoIds,
  } from '$lib/components/admin/photos/page/selection';
  import {
    persistAdditionalOrder,
    persistPhotoOrder,
    persistTaxonomy,
  } from '$lib/components/admin/photos/persist';
  import {
    getAdminPhotosPrefs,
    setAdminPhotosPrefs,
  } from '$lib/stores/admin-photos-prefs';
  import { photoPublicUrl } from '$lib/utils/storage-url';
  import type {
    AdminCategory,
    AdminPhoto,
    AdminPhotoImage,
    AdminTag,
  } from '$lib/types/content';

  const { data, form } = $props();

  const photos = $derived(data.photos as AdminPhoto[]);
  const categories = $derived(data.categories as AdminCategory[]);
  const tags = $derived(data.tags as AdminTag[]);
  const canReorder = $derived(Boolean(data.reorderEnabled));
  const galleryContext = $derived(
    ((data as { gallery?: { id: string; slug: string } }).gallery ?? null) as {
      id: string;
      slug: string;
    } | null,
  );
  const galleryScopeId = $derived(
    data.scopeKind === 'gallery' ? (galleryContext?.id ?? '') : '',
  );
  const routeBasePath = $derived(
    data.scopeKind === 'gallery'
      ? `/admin/${galleryContext?.slug ?? ''}/photos`
      : '/admin/all/photos',
  );

  const serverCategoryIds = (photoId: string) =>
    data.photoCategoryIds[photoId] ?? [];
  const serverTagIds = (photoId: string) => data.photoTagIds[photoId] ?? [];
  const imagesForPhoto = (photoId: string) =>
    (data.photoImageMap[photoId] ?? []) as AdminPhotoImage[];

  const baseAdditionalOrder = (photoId: string) =>
    imagesForPhoto(photoId)
      .filter((image) => image.kind === 'additional')
      .sort((a, b) => a.position - b.position)
      .map((image) => image.id);

  const categoryById = (id: string) =>
    categories.find((category) => category.id === id) ?? null;
  const tagById = (id: string) => tags.find((tag) => tag.id === id) ?? null;

  let orderedAdditionalByPhoto = $state<Record<string, string[]>>({});
  let selectedCategoryIdsByPhoto = $state<Record<string, string[]>>({});
  let selectedTagIdsByPhoto = $state<Record<string, string[]>>({});
  let selectedPhotoIds = $state<string[]>([]);
  let taxonomyDraftCategories = $state<string[]>([]);
  let taxonomyDraftTags = $state<string[]>([]);

  let orderedPhotoIds = $state<string[]>([]);
  let showBulkTaxonomy = $state(false);
  let gridEl = $state<HTMLUListElement | null>(null);
  let overlayCellSize = $state<number | null>(null);
  let isPollingInFlight = $state(false);

  const maxDensity = $derived(
    (data as { maxDensity?: number }).maxDensity ?? 20,
  );

  let density = $state(6);
  const gap = 8;
  let mounted = $state(false);

  const colCount = $derived(
    Math.max(1, Math.min(maxDensity, Number(density) || 6)),
  );

  $effect(() => {
    const el = gridEl;
    const cols = colCount;
    if (!el) return;
    const measure = () => {
      const w = el.clientWidth;
      if (w > 0 && cols > 0) {
        overlayCellSize = (w - gap * (cols - 1)) / cols;
      }
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  });

  const sectionMaxWidthStyle = 'max-width: 100%;';

  onMount(() => {
    mounted = true;
    const prefs = getAdminPhotosPrefs(maxDensity);
    if (prefs) density = prefs.density;
  });

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
  });

  const additionalOrder = (photoId: string) =>
    orderedAdditionalByPhoto[photoId] ?? baseAdditionalOrder(photoId);
  const selectedCategoryIds = (photoId: string) =>
    selectedCategoryIdsByPhoto[photoId] ?? serverCategoryIds(photoId);
  const selectedTagIds = (photoId: string) =>
    selectedTagIdsByPhoto[photoId] ?? serverTagIds(photoId);

  const onAdditionalReorder = async (photoId: string, next: string[]) => {
    orderedAdditionalByPhoto = { ...orderedAdditionalByPhoto, [photoId]: next };
    const galleryId = photoById.get(photoId)?.gallery_id;
    if (
      await persistAdditionalOrder(
        window.location.pathname,
        photoId,
        next,
        galleryId,
      )
    ) {
      invalidateAll();
    }
  };

  const togglePhotoSelected = (photoId: string, checked: boolean) => {
    selectedPhotoIds = toggleSelectedPhotoIds(
      selectedPhotoIds,
      photoId,
      checked,
    );
  };

  const selectAllVisiblePhotos = () => {
    selectedPhotoIds = selectAllPhotoIds(photos);
  };

  const clearSelectedPhotos = () => {
    selectedPhotoIds = [];
  };

  const hasVisiblePendingConversions = $derived(
    photos.some((photo) =>
      imagesForPhoto(photo.id).some((image) => !image.delivery_storage_path),
    ),
  );

  const onTaxonomyChange = async (
    photoId: string,
    categoryIds: string[],
    tagIds: string[],
  ) => {
    selectedCategoryIdsByPhoto = {
      ...selectedCategoryIdsByPhoto,
      [photoId]: categoryIds,
    };
    selectedTagIdsByPhoto = { ...selectedTagIdsByPhoto, [photoId]: tagIds };
    if (
      await persistTaxonomy(
        window.location.pathname,
        photoId,
        categoryIds,
        tagIds,
        photoById.get(photoId)?.gallery_id,
      )
    ) {
      invalidateAll();
    }
  };

  const addTaxonomyDraft = (type: 'category' | 'tag', id: string) => {
    if (type === 'category') {
      const next = addTaxonomyDraftId(taxonomyDraftCategories, id);
      if (next === taxonomyDraftCategories) return;
      taxonomyDraftCategories = next;
      return;
    }

    const next = addTaxonomyDraftId(taxonomyDraftTags, id);
    if (next === taxonomyDraftTags) return;
    taxonomyDraftTags = next;
  };

  const removeTaxonomyDraft = (type: 'category' | 'tag', id: string) => {
    if (type === 'category') {
      const next = removeTaxonomyDraftId(taxonomyDraftCategories, id);
      if (next === taxonomyDraftCategories) return;
      taxonomyDraftCategories = next;
      return;
    }

    const next = removeTaxonomyDraftId(taxonomyDraftTags, id);
    if (next === taxonomyDraftTags) return;
    taxonomyDraftTags = next;
  };

  async function onPhotoDragEnd(event: unknown) {
    if (!canReorder) return;
    const e = event as { canceled?: boolean; operation?: { source: unknown } };
    if (e.canceled || !e.operation?.source) return;
    const source = e.operation.source as Parameters<typeof isSortable>[0];
    if (!isSortable(source)) return;
    const { initialIndex, index } = source as {
      initialIndex: number;
      index: number;
    };
    if (initialIndex === index) return;
    const next = [...orderedPhotoIds];
    const [removed] = next.splice(initialIndex, 1);
    next.splice(index, 0, removed);
    orderedPhotoIds = next;
    if (
      await persistPhotoOrder(window.location.pathname, next, galleryScopeId)
    ) {
      invalidateAll();
    }
  }

  const updateDensity = (next: number) => {
    density = next;
    setAdminPhotosPrefs({ density }, maxDensity);
  };

  const pollPendingConversions = async () => {
    if (isPollingInFlight || !hasVisiblePendingConversions) return;
    isPollingInFlight = true;
    try {
      await invalidateAll();
    } finally {
      isPollingInFlight = false;
    }
  };

  $effect(() => {
    if (!hasVisiblePendingConversions) return;
    const intervalId = setInterval(() => {
      void pollPendingConversions();
    }, 3000);
    return () => clearInterval(intervalId);
  });
</script>

<div class="flex items-baseline justify-between gap-4">
  <div class="flex items-center gap-3">
    <AdminHeading>
      {data.scopeKind === 'gallery'
        ? `Photos /${galleryContext?.slug ?? ''}`
        : 'Photos /all'}
    </AdminHeading>
    <AdminButton
      size="sm"
      variant="toggle"
      selected={!data.showArchived}
      href={routeBasePath}
    >
      Active ({data.activeCount})
    </AdminButton>
    <AdminButton
      size="sm"
      variant="toggle"
      selected={data.showArchived}
      href={`${routeBasePath}?showArchived=1`}
    >
      Archived ({data.archivedCount})
    </AdminButton>
  </div>
</div>

{#if form?.message}
  <p class="mt-3 w-max rounded border border-border px-3 py-2 text-sm">
    {form.message}
  </p>
{/if}
{#if hasVisiblePendingConversions}
  <p class="mt-2 text-xs text-text-muted">
    Auto-refreshing while image processing completes...
  </p>
{/if}

<AdminPhotosFilterForm
  q={data.q}
  {categories}
  {tags}
  filterCategoryId={data.filterCategoryId}
  filterTagId={data.filterTagId}
  filterGalleryId={data.filterGalleryId}
  galleries={data.galleries}
  showArchived={data.showArchived}
  showGalleryFilter={data.scopeKind === 'all'}
  densityVisible={mounted}
  densityColCount={colCount}
  densityMax={maxDensity}
  onDensityChange={updateDensity}
/>

<AdminPhotosBulkPanel
  {selectedPhotoIds}
  showArchived={data.showArchived}
  {categories}
  {tags}
  {taxonomyDraftCategories}
  {taxonomyDraftTags}
  {categoryById}
  {tagById}
  {addTaxonomyDraft}
  {removeTaxonomyDraft}
  {selectAllVisiblePhotos}
  {clearSelectedPhotos}
  {galleryScopeId}
  galleries={data.galleries}
  allowMove={data.scopeKind === 'all'}
  {showBulkTaxonomy}
  onToggleShowBulkTaxonomy={() => (showBulkTaxonomy = !showBulkTaxonomy)}
  hideTaxonomyEditor={true}
/>

<section class="mt-8">
  <div
    class="mx-auto flex w-full items-start gap-6"
    style={sectionMaxWidthStyle}
  >
    <div class="min-w-0 flex-1">
      <DragDropProvider onDragEnd={onPhotoDragEnd}>
        <ul
          bind:this={gridEl}
          class="grid"
          style="grid-template-columns: repeat({colCount}, minmax(0, 1fr)); gap: {gap}px;"
        >
          {#each orderedPhotoIds as id, index (id)}
            {@const photo = photoById.get(id)}
            {#if photo}
              {#if canReorder}
                {@const sortable = createSortable({ id, index })}
                <li {@attach sortable.attach} class="cursor-move">
                  <AdminPhotoCard
                    {index}
                    {photo}
                    editHref={`/admin/${photo.gallery_slug}/photos/edit/${photo.id}`}
                    images={imagesForPhoto(photo.id)}
                    {categories}
                    {tags}
                    {selectedPhotoIds}
                    selectedCategoryIds={selectedCategoryIds(photo.id)}
                    selectedTagIds={selectedTagIds(photo.id)}
                    {onTaxonomyChange}
                    additionalOrder={additionalOrder(photo.id)}
                    onTogglePhotoSelected={togglePhotoSelected}
                    {onAdditionalReorder}
                    gridMode={true}
                    isDraggingPhoto={sortable.isDragging}
                  />
                </li>
              {:else}
                <li>
                  <AdminPhotoCard
                    {index}
                    {photo}
                    editHref={`/admin/${photo.gallery_slug}/photos/edit/${photo.id}`}
                    images={imagesForPhoto(photo.id)}
                    {categories}
                    {tags}
                    {selectedPhotoIds}
                    selectedCategoryIds={selectedCategoryIds(photo.id)}
                    selectedTagIds={selectedTagIds(photo.id)}
                    {onTaxonomyChange}
                    additionalOrder={additionalOrder(photo.id)}
                    onTogglePhotoSelected={togglePhotoSelected}
                    {onAdditionalReorder}
                    gridMode={true}
                    isDraggingPhoto={false}
                  />
                </li>
              {/if}
            {/if}
          {/each}
        </ul>

        {#if canReorder}
          <DragOverlay>
            {#snippet children(source)}
              {@const photo = photoById.get(String(source.id))}
              {#if photo}
                {@const lead =
                  imagesForPhoto(photo.id).find((img) => img.kind === 'lead') ??
                  null}
                <div
                  class="relative flex aspect-square flex-col overflow-hidden rounded border-2 border-brand bg-surface shadow-xl"
                  style="width: {overlayCellSize ?? 160}px;"
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
                        class="grid h-full w-full place-items-center rounded bg-surface-muted text-xs text-text-muted uppercase"
                      >
                        {lead ? 'pending' : 'no lead'}
                      </div>
                    {/if}
                  </div>
                  <div
                    class="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-2 pt-6 pb-2"
                  >
                    <p
                      class="truncate text-xs font-medium tracking-wider text-white"
                    >
                      {photo.title}
                    </p>
                    <p class="truncate text-xs text-white/80">
                      /{photo.gallery_slug}/photo/{photo.slug}
                    </p>
                  </div>
                </div>
              {/if}
            {/snippet}
          </DragOverlay>
        {/if}
      </DragDropProvider>
    </div>

    {#if showBulkTaxonomy}
      <aside class="sticky top-20 w-full max-w-[300px] flex-shrink-0">
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
      </aside>
    {/if}
  </div>
</section>
