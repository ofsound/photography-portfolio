<script lang="ts">
  import { enhance } from '$app/forms';
  import { DragDropProvider, DragOverlay } from '@dnd-kit/svelte';
  import { createSortable, isSortable } from '@dnd-kit/svelte/sortable';

  import AdminButton from '$lib/components/admin/AdminButton.svelte';
  import PhotoUploadZone from '$lib/components/admin/PhotoUploadZone.svelte';
  import ThumbnailCropEditor from '$lib/components/admin/ThumbnailCropEditor.svelte';

  import { photoPublicUrl } from '$lib/utils/storage-url';
  import type { AdminPhoto, AdminPhotoImage } from '$lib/types/content';

  const {
    photo,
    images,
    additionalOrder,
    onAdditionalReorder,
    draftTitle,
    draftSlug,
  } = $props<{
    photo: AdminPhoto | (Omit<AdminPhoto, 'id'> & { id: null });
    images: AdminPhotoImage[];
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
        <p class="text-xs tracking-widest uppercase">
          Additional Images (drag to reorder)
        </p>
        <p class="text-sm text-text-muted">No additional images.</p>
      </div>
    {:else}
      {#if lead}
        <div
          class="grid gap-2 border border-border bg-surface p-4 sm:grid-cols-[1fr_auto] sm:items-start"
        >
          <div class="flex min-w-0 flex-col gap-2 text-xs">
            {#if lead.delivery_storage_path}
              <div class="mt-2">
                <ThumbnailCropEditor
                  imageId={lead.id}
                  deliveryStoragePath={lead.delivery_storage_path}
                  sourceStoragePath={lead.source_storage_path}
                  altText={lead.alt_text ?? photo.title}
                  dimensions={lead.dimensions}
                  initialCrop={{
                    thumb_crop_x: lead.thumb_crop_x,
                    thumb_crop_y: lead.thumb_crop_y,
                    thumb_crop_zoom: lead.thumb_crop_zoom,
                  }}
                  photoId={photo.id}
                  galleryId={photo.gallery_id}
                />
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
                variant="subtle"
                href="/admin/download-original/{lead.id}"
              >
                Download Original
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
        </div>
      {:else}
        <p class="text-sm text-text-muted">No lead image set.</p>
      {/if}

      <div class="grid gap-2">
        <p class="text-xs tracking-widest uppercase">
          Additional Images (drag to reorder)
        </p>

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
                    class="flex cursor-move flex-col gap-2 rounded border border-border bg-surface p-2 sm:flex-row sm:items-center"
                    class:opacity-50={sortable.isDragging}
                  >
                    {#if image.delivery_storage_path}
                      <div
                        class="flex h-24 w-32 shrink-0 items-center justify-center overflow-hidden rounded"
                      >
                        <img
                          src={photoPublicUrl(image.delivery_storage_path, 320)}
                          alt={image.alt_text ?? photo.title}
                          class="max-h-full max-w-full object-contain"
                        />
                      </div>
                    {:else}
                      <div
                        class="grid h-24 w-32 shrink-0 animate-pulse place-items-center rounded border border-border-strong text-xs uppercase"
                      >
                        pending
                      </div>
                    {/if}

                    <div
                      class="ml-auto flex shrink-0 flex-wrap items-center gap-2"
                    >
                      {#if image.source_storage_path}
                        <AdminButton
                          size="sm"
                          variant="subtle"
                          href="/admin/download-original/{image.id}"
                        >
                          Download Original
                        </AdminButton>
                      {/if}
                      <form method="POST" action="?/setLead" use:enhance>
                        <input type="hidden" name="photo_id" value={photo.id} />
                        <input
                          type="hidden"
                          name="gallery_id"
                          value={photo.gallery_id}
                        />
                        <input type="hidden" name="image_id" value={image.id} />
                        <AdminButton size="sm" type="submit" variant="submit"
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
                        <input type="hidden" name="image_id" value={image.id} />
                        <input
                          type="hidden"
                          name="gallery_id"
                          value={photo.gallery_id}
                        />
                        <AdminButton variant="danger" size="sm" type="submit"
                          >Delete</AdminButton
                        >
                      </form>
                    </div>
                  </li>
                {/if}
              {/each}
            </ul>

            <DragOverlay>
              {#snippet children(source)}
                {@const dragImage = imageById(String(source.id))}
                {#if dragImage}
                  <div
                    class="grid w-44 gap-2 rounded border-2 border-brand bg-surface p-2 shadow-xl"
                    role="presentation"
                  >
                    {#if dragImage.delivery_storage_path}
                      <div
                        class="flex h-24 w-full items-center justify-center overflow-hidden rounded bg-surface-muted"
                      >
                        <img
                          src={photoPublicUrl(
                            dragImage.delivery_storage_path,
                            320,
                          )}
                          alt={dragImage.alt_text ?? photo.title}
                          class="max-h-full max-w-full object-contain"
                        />
                      </div>
                    {:else}
                      <div
                        class="grid h-24 w-full animate-pulse place-items-center rounded border border-border-strong text-xs uppercase"
                      >
                        pending
                      </div>
                    {/if}
                    <p
                      class="truncate text-xs tracking-widest text-text-muted uppercase"
                    >
                      Additional image
                    </p>
                  </div>
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
