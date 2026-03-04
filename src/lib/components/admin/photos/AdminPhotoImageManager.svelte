<script lang="ts">
  import { enhance } from '$app/forms';
  import { DragDropProvider, DragOverlay } from '@dnd-kit/svelte';
  import { createSortable, isSortable } from '@dnd-kit/svelte/sortable';

  import AdminButton from '$lib/components/admin/AdminButton.svelte';
  import PhotoConversionBadge from '$lib/components/admin/PhotoConversionBadge.svelte';
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
  const pendingImageCount = $derived(
    images.filter((image: AdminPhotoImage) => !image.delivery_storage_path)
      .length,
  );
  const imageById = (imageId: string) =>
    images.find((image: AdminPhotoImage) => image.id === imageId) ?? null;

  const imageConversionState = (
    image: AdminPhotoImage,
  ): 'ready' | 'converting' | 'unknown' => {
    if (image.delivery_storage_path) return 'ready';
    if (image.source_storage_path) return 'converting';
    return 'unknown';
  };

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

<h2 class="text-xl tracking-(--tracking-heading) uppercase">Images</h2>
<div class="flex min-w-0 gap-12">
  <div class="grid min-w-0 flex-1 gap-3 p-3">
    <div class="flex flex-wrap items-center gap-2">
      <span
        class="rounded border border-border px-2 py-1 text-xs tracking-(--tracking-tight) uppercase"
      >
        Processing: {pendingImageCount}
      </span>
    </div>

    {#if isDraft}
      <p class="text-sm text-text-muted">No lead image set.</p>
      <div class="grid gap-2">
        <p class="text-xs tracking-(--tracking-tight) uppercase">
          Additional Images (drag to reorder)
        </p>
        <p class="text-sm text-text-muted">No additional images.</p>
      </div>
    {:else}
      {#if lead}
        <div
          class="grid gap-2 rounded p-2 sm:grid-cols-[auto_1fr_auto] sm:items-start"
        >
          {#if lead.delivery_storage_path}
            <div
              class="flex h-24 w-32 shrink-0 items-center justify-center overflow-hidden rounded"
            >
              <img
                src={photoPublicUrl(lead.delivery_storage_path, 360)}
                alt={lead.alt_text ?? photo.title}
                class="max-h-full max-w-full object-contain"
              />
            </div>
          {:else}
            <div
              class="grid h-24 w-32 shrink-0 place-items-center rounded border border-border-strong text-xs uppercase"
            >
              pending
            </div>
          {/if}

          <div class="flex min-w-0 flex-col gap-2 text-xs">
            <div
              class="flex items-center gap-2 tracking-(--tracking-tight) uppercase"
            >
              <span>Lead Image</span>
              <PhotoConversionBadge state={imageConversionState(lead)} />
            </div>
            {#if lead.delivery_storage_path}
              <details class="min-w-0">
                <summary
                  class="cursor-pointer text-xs tracking-(--tracking-tight) uppercase"
                  >Edit thumbnail crop</summary
                >
                <div class="mt-3">
                  <ThumbnailCropEditor
                    imageId={lead.id}
                    deliveryStoragePath={lead.delivery_storage_path}
                    altText={lead.alt_text ?? photo.title}
                    dimensions={lead.dimensions}
                    initialCrop={{
                      thumb_crop_x: lead.thumb_crop_x,
                      thumb_crop_y: lead.thumb_crop_y,
                      thumb_crop_zoom: lead.thumb_crop_zoom,
                    }}
                    photoId={photo.id}
                  />
                </div>
              </details>
            {/if}
          </div>

          <form method="POST" action="?/removeImage" use:enhance>
            <input type="hidden" name="image_id" value={lead.id} />
            <AdminButton variant="danger-outline" size="sm" type="submit"
              >Delete</AdminButton
            >
          </form>
        </div>
      {:else}
        <p class="text-sm text-text-muted">No lead image set.</p>
      {/if}

      <div class="grid gap-2">
        <p class="text-xs tracking-(--tracking-tight) uppercase">
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
                    class="grid cursor-move gap-2 rounded p-2 sm:grid-cols-[auto_1fr_auto_auto] sm:items-center {i %
                      2 ===
                    0
                      ? 'bg-surface'
                      : 'bg-surface-muted'}"
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
                        class="grid h-24 w-32 shrink-0 place-items-center rounded border border-border-strong text-xs uppercase"
                      >
                        pending
                      </div>
                    {/if}

                    <div></div>

                    <form method="POST" action="?/setLead" use:enhance>
                      <input type="hidden" name="photo_id" value={photo.id} />
                      <input type="hidden" name="image_id" value={image.id} />
                      <AdminButton size="sm" type="submit">Set Lead</AdminButton
                      >
                    </form>

                    <form method="POST" action="?/removeImage" use:enhance>
                      <input type="hidden" name="image_id" value={image.id} />
                      <AdminButton
                        variant="danger-outline"
                        size="sm"
                        type="submit">Delete</AdminButton
                      >
                    </form>
                  </li>
                {/if}
              {/each}
            </ul>

            <DragOverlay>
              {#snippet children(source)}
                {@const dragImage = imageById(String(source.id))}
                {#if dragImage}
                  <div
                    class="border-primary grid w-44 gap-2 rounded border-2 bg-surface p-2 shadow-xl"
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
                        class="grid h-24 w-full place-items-center rounded border border-border-strong text-xs uppercase"
                      >
                        pending
                      </div>
                    {/if}
                    <p
                      class="truncate text-xs tracking-(--tracking-tight) text-text-muted uppercase"
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
      existingImageCount={images.length}
      {draftTitle}
      {draftSlug}
    />
  </div>
</div>
