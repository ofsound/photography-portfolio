<script lang="ts">
  import { resolve } from '$app/paths';
  import { parseDimensions } from '$lib/utils/parse-dimensions';
  import {
    GALLERY_DETAIL_SHARED_WIDTH,
    photoPublicUrl,
  } from '$lib/utils/storage-url';
  import GalleryColumns from './layout/GalleryColumns.svelte';
  import GalleryCoverage from './layout/GalleryCoverage.svelte';
  import GalleryRows from './layout/GalleryRows.svelte';
  import type { GalleryGridModel } from './gallery-grid-model';

  const { model } = $props<{ model: GalleryGridModel }>();
</script>

{#if model.layoutMode === 'uniform'}
  <ul
    class="grid"
    style={`grid-template-columns: repeat(${model.colCount}, minmax(0, 1fr)); gap: ${model.gap}px;`}
  >
    {#each model.photos as photo, index (photo.id)}
      <li>
        <a
          href={resolve(
            model.withCurrentSearch(
              model.photoPath(photo.slug),
            ) as `/${string}`,
          )}
          use:model.registerTile={photo.slug}
          data-photo-slug={photo.slug}
          data-entrance-slug={photo.slug}
          aria-disabled={model.entranceLocked ? 'true' : undefined}
          class="group relative block overflow-hidden {model.entranceLocked
            ? 'pointer-events-none'
            : ''}"
          style={`aspect-ratio: ${model.uniformRatio};`}
          onclick={(event: MouseEvent) => model.onOpenPhoto(event, photo.slug)}
        >
          {#if photo.leadImage}
            {@const entranceFx = model.entranceFx(photo.slug, index)}
            {#key `${model.entranceBatchKey}:${photo.id}`}
              <div
                class={`h-full w-full ${entranceFx.className}`}
                style={entranceFx.style}
              >
                <img
                  src={photoPublicUrl(
                    photo.leadImage.delivery_storage_path,
                    GALLERY_DETAIL_SHARED_WIDTH,
                  )}
                  alt={photo.leadImage.alt_text ?? photo.title}
                  class="block h-full w-full object-cover transition-transform duration-500 ease-cinematic {model.hasThumbCrop(
                    photo.leadImage,
                  )
                    ? 'tile-img-crop'
                    : model.showThumbnailZoomHover
                      ? 'group-hover:scale-[1.03]'
                      : ''}"
                  style={model.thumbCropStyle(
                    photo.leadImage,
                    model.uniformRatio,
                  )}
                  loading="eager"
                />
              </div>
            {/key}
          {/if}
        </a>
      </li>
    {/each}

    {#if model.isLoadingMore}
      {#each Array.from({ length: model.placeholderCount }) as _, index (index)}
        <li
          class="animate-pulse bg-surface-muted"
          style={`aspect-ratio: ${model.uniformRatio};`}
        ></li>
      {/each}
    {/if}
  </ul>
{:else if model.layoutMode === 'coverage'}
  <GalleryCoverage {model} />
{:else if model.layoutMode === 'rows'}
  <GalleryRows {model} />
{:else if model.layoutMode === 'columns'}
  <GalleryColumns {model} />
{:else}
  <ul
    class="columns-2 md:columns-4 lg:columns-6"
    style={`columns: ${model.colCount}; column-gap: ${model.gap}px;`}
  >
    {#each model.photos as photo, index (photo.id)}
      {#if photo.leadImage}
        {@const knownRatio = parseDimensions(photo.leadImage.dimensions)}
        {@const entranceFx = model.entranceFx(photo.slug, index)}
        <li class="break-inside-avoid" style="margin-bottom: {model.gap}px">
          <a
            href={resolve(
              model.withCurrentSearch(
                model.photoPath(photo.slug),
              ) as `/${string}`,
            )}
            use:model.registerTile={photo.slug}
            data-photo-slug={photo.slug}
            data-entrance-slug={photo.slug}
            aria-disabled={model.entranceLocked ? 'true' : undefined}
            class="group relative block overflow-hidden {model.entranceLocked
              ? 'pointer-events-none'
              : ''}"
            style={knownRatio
              ? `aspect-ratio: ${knownRatio.width / knownRatio.height};`
              : ''}
            onclick={(event: MouseEvent) =>
              model.onOpenPhoto(event, photo.slug)}
          >
            {#key `${model.entranceBatchKey}:${photo.id}`}
              <div class={entranceFx.className} style={entranceFx.style}>
                <img
                  src={photoPublicUrl(
                    photo.leadImage.delivery_storage_path,
                    GALLERY_DETAIL_SHARED_WIDTH,
                  )}
                  alt={photo.leadImage.alt_text ?? photo.title}
                  class="block h-auto w-full object-cover transition-transform duration-500 ease-cinematic {model.hasThumbCrop(
                    photo.leadImage,
                  )
                    ? 'tile-img-crop'
                    : model.showThumbnailZoomHover
                      ? 'group-hover:scale-[1.02]'
                      : ''}"
                  style={model.thumbCropStyle(
                    photo.leadImage,
                    model.tileAspectRatio(photo),
                  )}
                  loading="eager"
                  onload={(event) => {
                    if (
                      !knownRatio &&
                      event.currentTarget instanceof HTMLImageElement
                    ) {
                      const img = event.currentTarget;
                      const anchor = img.closest('a');
                      if (anchor && img.naturalWidth && img.naturalHeight) {
                        anchor.style.aspectRatio = String(
                          img.naturalWidth / img.naturalHeight,
                        );
                      }
                    }
                  }}
                />
              </div>
            {/key}
          </a>
        </li>
      {/if}
    {/each}

    {#if model.isLoadingMore}
      {#each Array.from({ length: model.placeholderCount }) as _, index (index)}
        <li
          class="animate-pulse break-inside-avoid bg-surface-muted"
          style={`height: ${120 + (index % 5) * 34}px; margin-bottom: ${model.gap}px;`}
        ></li>
      {/each}
    {/if}
  </ul>
{/if}

<style>
  .tile-img-crop {
    object-fit: cover !important;
  }

  :global([data-contact-sheet-promoted='true'] .thumb-entrance-fx),
  :global([data-contact-sheet-promoted='true'] .thumb-entrance-fx *),
  :global([data-contact-sheet-promoted='true'] [data-photo-slug]),
  :global([data-contact-sheet-promoted='true'] [data-photo-slug] img) {
    animation: none !important;
    transition: none !important;
  }

  :global([data-contact-sheet-promoted='true'] [data-photo-slug] img) {
    transform: none !important;
  }

  :global([data-promoted] .thumb-entrance-fx),
  :global([data-promoted] .thumb-entrance-fx--await),
  :global([data-promoted] .thumb-entrance-fx--cascade),
  :global([data-promoted] .thumb-entrance-fx--lift),
  :global([data-promoted] .thumb-entrance-fx--pop) {
    animation: none !important;
    opacity: 1 !important;
    transform: none !important;
  }

  :global([data-promoted] .tile-img) {
    object-fit: cover;
    height: 100%;
  }
</style>
