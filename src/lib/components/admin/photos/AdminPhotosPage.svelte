<script lang="ts">
  import { invalidateAll } from '$app/navigation';
  import { onMount } from 'svelte';

  import { DragDropProvider, DragOverlay } from '@dnd-kit/svelte';
  import { createSortable, isSortable } from '@dnd-kit/svelte/sortable';

  import AdminButton from '$lib/components/admin/AdminButton.svelte';
  import AdminGalleryNav from '$lib/components/admin/AdminGalleryNav.svelte';
  import AdminHeading from '$lib/components/admin/AdminHeading.svelte';
  import AdminStatusMessage from '$lib/components/admin/AdminStatusMessage.svelte';
  import PhotoTaxonomyEditor from '$lib/components/admin/PhotoTaxonomyEditor.svelte';
  import AdminPhotoCard from '$lib/components/admin/photos/AdminPhotoCard.svelte';
  import AdminPhotosBulkPanel from '$lib/components/admin/photos/AdminPhotosBulkPanel.svelte';
  import AdminPhotosFilterForm from '$lib/components/admin/photos/AdminPhotosFilterForm.svelte';
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

  type GalleryOption = {
    id: string;
    slug: string;
    name: string;
  };

  type GalleryContext = {
    id: string;
    slug: string;
    name: string;
  };

  type PhotosPageData = {
    photos: AdminPhoto[];
    categories: AdminCategory[];
    tags: AdminTag[];
    reorderEnabled: boolean;
    scopeKind: 'gallery' | 'all';
    gallery?: GalleryContext;
    filterGalleryId: string;
    galleries: GalleryOption[];
    photoCategoryIds: Record<string, string[]>;
    photoTagIds: Record<string, string[]>;
    photoImageMap: Record<string, AdminPhotoImage[]>;
    showArchived: boolean;
    q: string;
    filterCategoryId: string;
    filterTagId: string;
    activeCount: number;
    archivedCount: number;
    maxDensity?: number;
  };

  type PhotosPageForm =
    | {
        message?: string;
        success?: boolean;
        fieldErrors?: Record<string, string | undefined>;
        values?: Record<string, string | undefined>;
      }
    | null
    | undefined;

  const {
    data,
    form,
    allScopeLabel = 'Library',
    allRouteBasePath = '/admin/library',
  } = $props<{
    data: PhotosPageData;
    form?: PhotosPageForm;
    allScopeLabel?: string;
    allRouteBasePath?: string;
  }>();

  const photos = $derived<AdminPhoto[]>(data.photos);
  const categories = $derived<AdminCategory[]>(data.categories);
  const tags = $derived<AdminTag[]>(data.tags);
  const canReorder = $derived<boolean>(Boolean(data.reorderEnabled));
  const galleryContext = $derived<GalleryContext | null>(data.gallery ?? null);
  const filteredGallerySlug = $derived<string | null>(
    data.filterGalleryId
      ? (data.galleries.find(
          (gallery: GalleryOption) => gallery.id === data.filterGalleryId,
        )?.slug ?? null)
      : null,
  );
  const galleryScopeId = $derived<string>(
    data.scopeKind === 'gallery' ? (galleryContext?.id ?? '') : '',
  );
  const routeBasePath = $derived<string>(
    data.scopeKind === 'gallery'
      ? `/admin/${galleryContext?.slug ?? ''}/photos`
      : allRouteBasePath,
  );

  const serverCategoryIds = (photoId: string): string[] =>
    data.photoCategoryIds[photoId] ?? [];
  const serverTagIds = (photoId: string): string[] =>
    data.photoTagIds[photoId] ?? [];
  const imagesForPhoto = (photoId: string): AdminPhotoImage[] =>
    data.photoImageMap[photoId] ?? [];

  const baseAdditionalOrder = (photoId: string) =>
    imagesForPhoto(photoId)
      .filter((image: AdminPhotoImage) => image.kind === 'additional')
      .sort((a: AdminPhotoImage, b: AdminPhotoImage) => a.position - b.position)
      .map((image: AdminPhotoImage) => image.id);

  const categoryById = (id: string) =>
    categories.find((category) => category.id === id) ?? null;
  const tagById = (id: string) => tags.find((tag) => tag.id === id) ?? null;

  const baseAdditionalByPhoto = $derived.by<Record<string, string[]>>(() => {
    const nextOrder: Record<string, string[]> = {};

    for (const photo of photos) {
      nextOrder[photo.id] = baseAdditionalOrder(photo.id);
    }

    return nextOrder;
  });
  const baseSelectedCategoryIdsByPhoto = $derived.by<Record<string, string[]>>(
    () => {
      const nextCategoryIds: Record<string, string[]> = {};

      for (const photo of photos) {
        nextCategoryIds[photo.id] = serverCategoryIds(photo.id);
      }

      return nextCategoryIds;
    },
  );
  const baseSelectedTagIdsByPhoto = $derived.by<Record<string, string[]>>(
    () => {
      const nextTagIds: Record<string, string[]> = {};

      for (const photo of photos) {
        nextTagIds[photo.id] = serverTagIds(photo.id);
      }

      return nextTagIds;
    },
  );

  let orderedAdditionalOverrides = $state<Record<string, string[]>>({});
  let selectedCategoryOverrides = $state<Record<string, string[]>>({});
  let selectedTagOverrides = $state<Record<string, string[]>>({});
  let selectedPhotoIds = $state<string[]>([]);
  let taxonomyDraftCategories = $state<string[]>([]);
  let taxonomyDraftTags = $state<string[]>([]);

  let orderedPhotoIdsOverride = $state<string[] | null>(null);
  let showBulkTaxonomy = $state(false);
  let overlayCellSize = $state<number | null>(null);
  let isPollingInFlight = $state(false);

  const maxDensity = $derived(data.maxDensity ?? 20);

  let density = $state(6);
  const gap = 8;
  let mounted = $state(false);

  const colCount = $derived(
    Math.max(1, Math.min(maxDensity, Number(density) || 6)),
  );

  const measureGrid = (node: HTMLUListElement) => {
    const measure = () => {
      const width = node.clientWidth;
      if (width > 0 && colCount > 0) {
        overlayCellSize = (width - gap * (colCount - 1)) / colCount;
      }
    };

    measure();
    const resizeObserver = new ResizeObserver(measure);
    resizeObserver.observe(node);

    return () => resizeObserver.disconnect();
  };

  const sectionMaxWidthStyle = 'max-width: 100%;';

  onMount(() => {
    mounted = true;
    const prefs = getAdminPhotosPrefs(maxDensity);
    if (prefs) density = prefs.density;

    const intervalId = setInterval(() => {
      if (!hasVisiblePendingConversions || isPollingInFlight) return;
      void pollPendingConversions();
    }, 3000);

    return () => clearInterval(intervalId);
  });

  const photoById = $derived<Map<string, AdminPhoto>>(
    new Map(photos.map((photo) => [photo.id, photo])),
  );
  const orderedPhotoIds = $derived<string[]>(
    orderedPhotoIdsOverride ?? photos.map((photo) => photo.id),
  );
  const additionalOrder = (photoId: string) =>
    orderedAdditionalOverrides[photoId] ?? baseAdditionalByPhoto[photoId] ?? [];
  const selectedCategoryIds = (photoId: string) =>
    selectedCategoryOverrides[photoId] ??
    baseSelectedCategoryIdsByPhoto[photoId] ??
    [];
  const selectedTagIds = (photoId: string) =>
    selectedTagOverrides[photoId] ?? baseSelectedTagIdsByPhoto[photoId] ?? [];

  const onAdditionalReorder = async (photoId: string, next: string[]) => {
    orderedAdditionalOverrides = {
      ...orderedAdditionalOverrides,
      [photoId]: next,
    };
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
      imagesForPhoto(photo.id).some(
        (image: AdminPhotoImage) => !image.delivery_storage_path,
      ),
    ),
  );

  const onTaxonomyChange = async (
    photoId: string,
    categoryIds: string[],
    tagIds: string[],
  ) => {
    selectedCategoryOverrides = {
      ...selectedCategoryOverrides,
      [photoId]: categoryIds,
    };
    selectedTagOverrides = { ...selectedTagOverrides, [photoId]: tagIds };

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

    const draggableEvent = event as {
      canceled?: boolean;
      operation?: { source: unknown };
    };
    if (draggableEvent.canceled || !draggableEvent.operation?.source) return;

    const source = draggableEvent.operation.source as Parameters<
      typeof isSortable
    >[0];
    if (!isSortable(source)) return;

    const { initialIndex, index } = source as {
      initialIndex: number;
      index: number;
    };
    if (initialIndex === index) return;

    const next = [...orderedPhotoIds];
    const [removed] = next.splice(initialIndex, 1);
    next.splice(index, 0, removed);
    orderedPhotoIdsOverride = next;

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
</script>

{#if data.scopeKind === 'gallery' && galleryContext}
  <AdminGalleryNav
    galleryName={galleryContext.name}
    gallerySlug={galleryContext.slug}
    activeCount={data.activeCount}
    archivedCount={data.archivedCount}
    showArchived={data.showArchived}
    currentView="photos"
  />
{:else}
  <div class="flex items-baseline justify-between gap-4">
    <div class="flex items-center gap-3">
      <AdminHeading>{allScopeLabel}</AdminHeading>
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
    {#if filteredGallerySlug}
      <div class="flex gap-2">
        <AdminButton
          href={`/admin/${filteredGallerySlug}/photos/upload`}
          variant="submit"
          size="xs"
        >
          Add Photos
        </AdminButton>
      </div>
    {/if}
  </div>
{/if}

{#if form?.message}
  <AdminStatusMessage type={form.success ? 'success' : 'error'} class="mt-3">
    {form.message}
  </AdminStatusMessage>
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
          {@attach measureGrid}
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
                    isDraggingPhoto={sortable.isDragging}
                    formState={form ?? undefined}
                  />
                </li>
              {:else}
                <li>
                  <AdminPhotoCard
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
                    isDraggingPhoto={false}
                    formState={form ?? undefined}
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
                  imagesForPhoto(photo.id).find(
                    (image: AdminPhotoImage) => image.kind === 'lead',
                  ) ?? null}
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
                        class:animate-pulse={Boolean(lead)}
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
