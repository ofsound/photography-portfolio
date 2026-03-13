<script lang="ts">
  import { resolve } from '$app/paths';
  import {
    GALLERY_DETAIL_SHARED_WIDTH,
    photoPublicUrl,
  } from '$lib/utils/storage-url';
  import type { GalleryGridModel } from '../gallery-grid-model';

  const { model } = $props<{ model: GalleryGridModel }>();
</script>

<ul
  class="grid h-full w-full"
  style={`grid-template-columns: repeat(${model.coverageCols}, minmax(0, 1fr)); grid-template-rows: repeat(${model.coverageRows}, minmax(0, 1fr)); gap: ${model.gap}px;`}
>
  {#each model.photos as photo, index (photo.id)}
    {@const entranceFx = model.entranceFx(photo.slug, index)}
    <li class="min-h-0 min-w-0">
      <a
        href={resolve(
          model.withCurrentSearch(model.photoPath(photo.slug)) as `/${string}`,
        )}
        use:model.registerTile={photo.slug}
        data-photo-slug={photo.slug}
        data-entrance-slug={photo.slug}
        aria-disabled={model.entranceLocked ? 'true' : undefined}
        class="group relative block h-full w-full overflow-hidden {model.entranceLocked
          ? 'pointer-events-none'
          : ''}"
        onclick={(event: MouseEvent) => model.onOpenPhoto(event, photo.slug)}
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
                  model.coverageAspect,
                )}
                loading="eager"
              />
            </div>
          {/key}
        {/if}
      </a>
    </li>
  {/each}

  {#each Array.from( { length: model.coveragePlaceholderCount }, ) as _, index (`placeholder-${index}`)}
    <li class="min-h-0 min-w-0 bg-surface-muted"></li>
  {/each}
</ul>

<style>
  .tile-img-crop {
    object-fit: cover !important;
  }
</style>
