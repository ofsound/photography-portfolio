<script lang="ts">
  import { resolve } from '$app/paths';
  import { SvelteMap } from 'svelte/reactivity';
  import {
    GALLERY_DETAIL_SHARED_WIDTH,
    photoPublicUrl,
  } from '$lib/utils/storage-url';
  import type { GalleryPhoto } from '$lib/types/content';
  import type { GalleryGridModel } from '../gallery-grid-model';

  const { model } = $props<{ model: GalleryGridModel }>();
  const CASCADE_STAGGER_MS = 42;

  const photosById = $derived.by<SvelteMap<string, GalleryPhoto>>(() => {
    const map = new SvelteMap<string, GalleryPhoto>();
    for (const photo of model.photos) {
      map.set(photo.id, photo);
    }
    return map;
  });
</script>

{#if model.columnsResult}
  <ul class="flex h-full w-full flex-row" style={`gap: ${model.gap}px;`}>
    {#each model.columnsResult.rows as col, colIdx (`cols-col-${colIdx}`)}
      <li class="flex min-w-0 flex-1 flex-col" style={`gap: ${model.gap}px;`}>
        {#each col.photos as entry, entryIdx (`cols-${entry.id}`)}
          {@const photo = photosById.get(entry.id)}
          {#if photo}
            {@const cascadeIdx =
              colIdx * (model.columnsResult.rows[0]?.photos.length ?? 1) +
              entryIdx}
            <div
              class="tile-cascade min-h-0"
              class:revealed={model.galleryRevealed}
              class:no-motion={model.reducedMotion}
              style="flex: {1 /
                entry.displayAspect} 1 0%; animation-delay: {model.galleryRevealed &&
              !model.reducedMotion
                ? cascadeIdx * CASCADE_STAGGER_MS
                : 0}ms"
            >
              <a
                href={resolve(
                  model.withCurrentSearch(
                    model.photoPath(photo.slug),
                  ) as `/${string}`,
                )}
                use:model.registerTile={photo.slug}
                class="group relative block h-full w-full overflow-hidden"
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
                      entry.displayAspect,
                    )}
                    loading="eager"
                  />
                {/if}
              </a>
            </div>
          {/if}
        {/each}
      </li>
    {/each}
  </ul>
{/if}

<style>
  .tile-img-crop {
    object-fit: contain !important;
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
