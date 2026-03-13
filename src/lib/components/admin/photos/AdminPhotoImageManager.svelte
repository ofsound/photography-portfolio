<script lang="ts">
  import { enhance } from '$app/forms';
  import { DragDropProvider, DragOverlay } from '@dnd-kit/svelte';
  import { createSortable, isSortable } from '@dnd-kit/svelte/sortable';

  import AdminCard from '$lib/components/admin/AdminCard.svelte';
  import AdminButton from '$lib/components/admin/AdminButton.svelte';
  import AdminHeading from '$lib/components/admin/AdminHeading.svelte';
  import PhotoUploadZone from '$lib/components/admin/PhotoUploadZone.svelte';
  import ThumbnailCropEditor from '$lib/components/admin/ThumbnailCropEditor.svelte';

  import type { GalleryCropConfig } from '$lib/types/gallery-crop';
  import { parseDimensions } from '$lib/utils/parse-dimensions';
  import { photoPublicUrl } from '$lib/utils/storage-url';
  import type { AdminPhoto, AdminPhotoImage } from '$lib/types/content';

  const {
    photo,
    images,
    galleryCropConfig,
    additionalOrder,
    onAdditionalReorder,
    draftTitle,
    draftSlug,
  } = $props<{
    photo: AdminPhoto | (Omit<AdminPhoto, 'id'> & { id: null });
    images: AdminPhotoImage[];
    galleryCropConfig: GalleryCropConfig;
    additionalOrder: string[];
    onAdditionalReorder: (
      photoId: string,
      orderedImageIds: string[],
    ) => void | Promise<void>;
    draftTitle: string;
    draftSlug: string;
  }>();

  const isDraft = $derived(photo.id === null || photo.id === undefined);
  const lead = $derived(
    images.find((image: AdminPhotoImage) => image.kind === 'lead') ?? null,
  );
  const canEditThumbnailCrop = $derived(
    galleryCropConfig.layoutMode === 'uniform',
  );
  const leadAspect = $derived.by(() => {
    const parsed = parseDimensions(lead?.dimensions ?? null);
    if (!parsed) return 1;
    return Math.max(0.2, parsed.width / parsed.height);
  });
  const leadPreviewStyle = $derived.by(() => {
    const maxWidthPx = leadAspect >= 1 ? 360 : 360 * leadAspect;
    return `aspect-ratio: ${leadAspect}; max-width: min(100%, ${maxWidthPx}px);`;
  });
  const imageById = (imageId: string) =>
    images.find((image: AdminPhotoImage) => image.id === imageId) ?? null;

  const onAdditionalDragEnd = (event: unknown) => {
    if (photo.id == null) return;
    const e = event as { canceled?: boolean; operation?: { source: unknown } };
    if (e.canceled || !e.operation?.source) return;
    const source = e.operation.source as Parameters<typeof isSortable>[0];
    if (!isSortable(source)) return;
    const { initialIndex, index } = source as {
      initialIndex: number;
      index: number;
    };
    if (initialIndex === index) return;
    const next = [...additionalOrder];
    const [removed] = next.splice(initialIndex, 1);
    next.splice(index, 0, removed);
    void onAdditionalReorder(photo.id, next);
  };
</script>

<div class="flex min-w-0 gap-12">
  <div class="grid min-w-0 flex-1 gap-3">
    {#if isDraft}
      <p class="text-sm text-text-muted">No lead image set.</p>
      <div class="grid gap-2">
        <AdminHeading level={3}
          >Additional Images (drag to reorder)</AdminHeading
        >
        <p class="text-sm text-text-muted">No additional images.</p>
      </div>
    {:else}
      {#if lead}
        <AdminCard
          class="grid gap-2 p-4 sm:grid-cols-[1fr_auto] sm:items-start"
        >
          <div class="flex min-w-0 flex-col gap-2 text-xs">
            {#if lead.delivery_storage_path}
              <div class="mt-2">
                {#if canEditThumbnailCrop}
                  {#key `${lead.id}_${galleryCropConfig.uniformThumbRatio}_${lead.thumb_crop_x ?? 'default'}_${lead.thumb_crop_y ?? 'default'}_${lead.thumb_crop_zoom ?? 'default'}`}
                    <ThumbnailCropEditor
                      imageId={lead.id}
                      deliveryStoragePath={lead.delivery_storage_path}
                      altText={lead.alt_text ?? photo.title}
                      dimensions={lead.dimensions}
                      cropAspect={galleryCropConfig.uniformThumbRatio}
                      initialCrop={{
                        thumb_crop_x: lead.thumb_crop_x,
                        thumb_crop_y: lead.thumb_crop_y,
                        thumb_crop_zoom: lead.thumb_crop_zoom,
                      }}
                      photoId={photo.id}
                      galleryId={photo.gallery_id}
                    />
                  {/key}
                {:else}
                  <div class="grid gap-2">
                    <div
                      class="relative w-full overflow-hidden rounded border border-border-strong bg-surface-muted"
                      style={leadPreviewStyle}
                    >
                      <img
                        src={photoPublicUrl(lead.delivery_storage_path, 800)}
                        alt={lead.alt_text ?? photo.title}
                        class="absolute inset-0 h-full w-full object-cover"
                        draggable="false"
                      />
                    </div>
                    <p class="text-text-muted">
                      Thumbnail crop is only available when the gallery layout
                      is uniform.
                    </p>
                  </div>
                {/if}
              </div>
            {:else}
              <div
                class="mt-2 grid h-24 w-32 animate-pulse place-items-center rounded border border-border-strong text-xs uppercase"
              >
                pending
              </div>
            {/if}
          </div>

          <div class="flex flex-col items-end gap-2">
            {#if lead.source_storage_path}
              <AdminButton
                size="sm"
                href="/admin/download-original/{lead.id}"
                class="px-2!"
                title="Download Original"
                aria-label="Download Original"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  class="h-4 w-4"
                  aria-hidden="true"
                >
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
              </AdminButton>
            {/if}
            <form
              method="POST"
              action="?/removeImage"
              use:enhance={({ cancel }) => {
                if (
                  !window.confirm(
                    'Are you sure you want to delete this image? This cannot be undone.',
                  )
                ) {
                  cancel();
                }
              }}
            >
              <input type="hidden" name="image_id" value={lead.id} />
              <input type="hidden" name="gallery_id" value={photo.gallery_id} />
              <AdminButton variant="danger" size="sm" type="submit"
                >Delete</AdminButton
              >
            </form>
          </div>
        </AdminCard>
      {:else}
        <p class="text-sm text-text-muted">No lead image set.</p>
      {/if}

      <div class="grid gap-2">
        <AdminHeading level={3}
          >Additional Images (drag to reorder)</AdminHeading
        >

        {#if additionalOrder.length === 0}
          <p class="text-sm text-text-muted">No additional images.</p>
        {:else}
          <DragDropProvider onDragEnd={onAdditionalDragEnd}>
            <ul class="grid gap-2">
              {#each additionalOrder as imageId, i (imageId)}
                {@const image = imageById(imageId)}
                {#if image}
                  {@const sortable = createSortable({
                    id: image.id,
                    index: i,
                  })}
                  <li
                    {@attach sortable.attach}
                    class:opacity-50={sortable.isDragging}
                  >
                    <AdminCard
                      variant="gradient"
                      class="grid cursor-move gap-2 p-2 sm:grid-cols-[auto_auto_1fr_auto] sm:items-center"
                    >
                      <div
                        aria-hidden="true"
                        class="mx-2 hidden self-center text-text-muted sm:flex sm:items-center"
                      >
                        <div
                          class="grid grid-cols-3 gap-0.5 rounded border border-border px-1 py-0.5"
                        >
                          {#each [0, 1, 2, 3, 4, 5] as dot (dot)}
                            <span
                              class="h-0.5 w-0.5 rounded-full bg-text-muted/80"
                            ></span>
                          {/each}
                        </div>
                      </div>
                      {#if image.delivery_storage_path}
                        <div
                          class="flex h-12 w-16 shrink-0 items-center justify-center overflow-hidden rounded"
                        >
                          <img
                            src={photoPublicUrl(
                              image.delivery_storage_path,
                              320,
                            )}
                            alt={image.alt_text ?? photo.title}
                            class="h-12 w-16 rounded object-cover"
                          />
                        </div>
                      {:else}
                        <div
                          class="grid h-12 w-16 shrink-0 animate-pulse place-items-center rounded border border-border-strong text-xs uppercase"
                        >
                          pending
                        </div>
                      {/if}

                      <div class="text-xs">
                        {image.alt_text ?? photo.title}
                      </div>

                      <div class="flex shrink-0 flex-wrap items-center gap-2">
                        {#if image.source_storage_path}
                          <AdminButton
                            size="xs"
                            href="/admin/download-original/{image.id}"
                            class="px-2!"
                            title="Download Original"
                            aria-label="Download Original"
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              stroke-width="2"
                              stroke-linecap="round"
                              stroke-linejoin="round"
                              class="h-4 w-4"
                              aria-hidden="true"
                            >
                              <path
                                d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"
                              />
                              <polyline points="7 10 12 15 17 10" />
                              <line x1="12" y1="15" x2="12" y2="3" />
                            </svg>
                          </AdminButton>
                        {/if}
                        <form method="POST" action="?/setLead" use:enhance>
                          <input
                            type="hidden"
                            name="photo_id"
                            value={photo.id}
                          />
                          <input
                            type="hidden"
                            name="gallery_id"
                            value={photo.gallery_id}
                          />
                          <input
                            type="hidden"
                            name="image_id"
                            value={image.id}
                          />
                          <AdminButton size="xs" type="submit" variant="submit"
                            >Set Lead</AdminButton
                          >
                        </form>

                        <form
                          method="POST"
                          action="?/removeImage"
                          use:enhance={({ cancel }) => {
                            if (
                              !window.confirm(
                                'Are you sure you want to delete this additional image? This cannot be undone.',
                              )
                            ) {
                              cancel();
                            }
                          }}
                        >
                          <input
                            type="hidden"
                            name="image_id"
                            value={image.id}
                          />
                          <input
                            type="hidden"
                            name="gallery_id"
                            value={photo.gallery_id}
                          />
                          <AdminButton variant="danger" size="xs" type="submit"
                            >Delete</AdminButton
                          >
                        </form>
                      </div>
                    </AdminCard>
                  </li>
                {/if}
              {/each}
            </ul>

            <DragOverlay>
              {#snippet children(source)}
                {@const dragImage = imageById(String(source.id))}
                {#if dragImage}
                  <AdminCard
                    variant="gradient"
                    class="grid cursor-move gap-2 p-2 sm:grid-cols-[auto_auto_1fr_auto] sm:items-center"
                  >
                    <div
                      aria-hidden="true"
                      class="mx-2 hidden self-center text-text-muted sm:flex sm:items-center"
                    >
                      <div
                        class="grid grid-cols-3 gap-0.5 rounded border border-border px-1 py-0.5"
                      >
                        {#each [0, 1, 2, 3, 4, 5] as dot (dot)}
                          <span
                            class="h-0.5 w-0.5 rounded-full bg-text-muted/80"
                          ></span>
                        {/each}
                      </div>
                    </div>
                    {#if dragImage.delivery_storage_path}
                      <div
                        class="flex h-12 w-16 shrink-0 items-center justify-center overflow-hidden rounded"
                      >
                        <img
                          src={photoPublicUrl(
                            dragImage.delivery_storage_path,
                            320,
                          )}
                          alt={dragImage.alt_text ?? photo.title}
                          class="h-12 w-16 rounded object-cover"
                        />
                      </div>
                    {:else}
                      <div
                        class="grid h-12 w-16 shrink-0 animate-pulse place-items-center rounded border border-border-strong text-xs uppercase"
                      >
                        pending
                      </div>
                    {/if}

                    <div class="text-xs">
                      {dragImage.alt_text ?? photo.title}
                    </div>

                    <div class="flex shrink-0 flex-wrap items-center gap-2">
                      {#if dragImage.source_storage_path}
                        <AdminButton
                          size="xs"
                          href="/admin/download-original/{dragImage.id}"
                          class="px-2!"
                          title="Download Original"
                          aria-label="Download Original"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            stroke-width="2"
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            class="h-4 w-4"
                            aria-hidden="true"
                          >
                            <path
                              d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"
                            />
                            <polyline points="7 10 12 15 17 10" />
                            <line x1="12" y1="15" x2="12" y2="3" />
                          </svg>
                        </AdminButton>
                      {/if}
                      <form method="POST" action="?/setLead" use:enhance>
                        <input type="hidden" name="photo_id" value={photo.id} />
                        <input
                          type="hidden"
                          name="gallery_id"
                          value={photo.gallery_id}
                        />
                        <input
                          type="hidden"
                          name="image_id"
                          value={dragImage.id}
                        />
                        <AdminButton size="xs" type="submit" variant="submit"
                          >Set Lead</AdminButton
                        >
                      </form>

                      <form
                        method="POST"
                        action="?/removeImage"
                        use:enhance={({ cancel }) => {
                          if (
                            !window.confirm(
                              'Are you sure you want to delete this additional image? This cannot be undone.',
                            )
                          ) {
                            cancel();
                          }
                        }}
                      >
                        <input
                          type="hidden"
                          name="image_id"
                          value={dragImage.id}
                        />
                        <input
                          type="hidden"
                          name="gallery_id"
                          value={photo.gallery_id}
                        />
                        <AdminButton variant="danger" size="xs" type="submit"
                          >Delete</AdminButton
                        >
                      </form>
                    </div>
                  </AdminCard>
                {/if}
              {/snippet}
            </DragOverlay>
          </DragDropProvider>
        {/if}
      </div>
    {/if}
  </div>

  <div class="min-w-0 flex-1">
    <PhotoUploadZone
      photoId={isDraft ? 'draft' : photo.id}
      galleryId={photo.gallery_id}
      existingImageCount={images.length}
      {draftTitle}
      {draftSlug}
    />
  </div>
</div>
