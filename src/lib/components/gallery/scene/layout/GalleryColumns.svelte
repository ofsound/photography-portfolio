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
            {@const fallbackRank = colIdx * 512 + entryIdx}
            {@const entranceFx = model.entranceFx(photo.slug, fallbackRank)}
            <div class="min-h-0" style="flex: {1 / entry.displayAspect} 1 0%;">
              <a
                href={resolve(
                  model.withCurrentSearch(
                    model.photoPath(photo.slug),
                  ) as `/${string}`,
                )}
                use:model.registerTile={photo.slug}
                data-entrance-slug={photo.slug}
                aria-disabled={model.entranceLocked ? 'true' : undefined}
                class="group relative block h-full w-full overflow-hidden {model.entranceLocked
                  ? 'pointer-events-none'
                  : ''}"
                onclick={(event: MouseEvent) =>
                  model.onOpenPhoto(event, photo.slug)}
              >
                {#if photo.leadImage}
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
                          entry.displayAspect,
                        )}
                        loading="eager"
                      />
                    </div>
                  {/key}
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
</style>
