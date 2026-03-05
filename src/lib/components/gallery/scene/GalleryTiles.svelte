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
  const CASCADE_STAGGER_MS = 42;
</script>

{#if model.layoutMode === 'uniform'}
  <ul
    class="grid"
    style={`grid-template-columns: repeat(${model.colCount}, minmax(0, 1fr)); gap: ${model.gap}px;`}
  >
    {#each model.photos as photo, index (photo.id)}
      <li>
        <div
          class="tile-cascade"
          class:revealed={model.galleryRevealed}
          class:no-motion={model.reducedMotion}
          style="animation-delay: {model.galleryRevealed && !model.reducedMotion
            ? index * CASCADE_STAGGER_MS
            : 0}ms"
        >
          <a
            href={resolve(
              model.withCurrentSearch(
                model.photoPath(photo.slug),
              ) as `/${string}`,
            )}
            use:model.registerTile={photo.slug}
            class="group relative block overflow-hidden"
            style={`aspect-ratio: ${model.uniformRatio};`}
            onclick={(event: MouseEvent) =>
              model.onOpenPhoto(event, photo.slug)}
          >
            {#if photo.leadImage}
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
            {/if}
          </a>
        </div>
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
        <li class="break-inside-avoid" style="margin-bottom: {model.gap}px">
          <div
            class="tile-cascade"
            class:revealed={model.galleryRevealed}
            class:no-motion={model.reducedMotion}
            style="animation-delay: {model.galleryRevealed &&
            !model.reducedMotion
              ? index * CASCADE_STAGGER_MS
              : 0}ms"
          >
            <a
              href={resolve(
                model.withCurrentSearch(
                  model.photoPath(photo.slug),
                ) as `/${string}`,
              )}
              use:model.registerTile={photo.slug}
              class="group relative block overflow-hidden"
              style={knownRatio
                ? `aspect-ratio: ${knownRatio.width / knownRatio.height};`
                : ''}
              onclick={(event: MouseEvent) =>
                model.onOpenPhoto(event, photo.slug)}
            >
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
            </a>
          </div>
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
    object-fit: contain !important;
  }

  :global([data-promoted] .tile-img) {
    object-fit: contain;
    height: 100%;
  }

  .tile-cascade {
    opacity: 0;
    transform: translateY(14px);
  }

  .tile-cascade.revealed {
    animation: cascadeIn 520ms cubic-bezier(0.22, 1, 0.36, 1) forwards;
  }

  .tile-cascade.no-motion.revealed {
    animation: none;
    opacity: 1;
    transform: none;
  }

  @keyframes cascadeIn {
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
</style>
