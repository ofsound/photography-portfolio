<script lang="ts">
  import { resolve } from '$app/paths';
  import {
    GALLERY_DETAIL_SHARED_WIDTH,
    photoPublicUrl,
  } from '$lib/utils/storage-url';
  import type { GalleryGridModel } from '../gallery-grid-model';

  const { model } = $props<{ model: GalleryGridModel }>();
  const CASCADE_STAGGER_MS = 42;
</script>

<ul
  class="grid h-full w-full"
  style={`grid-template-columns: repeat(${model.coverageCols}, minmax(0, 1fr)); grid-template-rows: repeat(${model.coverageRows}, minmax(0, 1fr)); gap: ${model.gap}px;`}
>
  {#each model.photos as photo, index (photo.id)}
    <li class="min-h-0 min-w-0">
      <div
        class="tile-cascade h-full"
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
          class="group relative block h-full w-full overflow-hidden"
          onclick={(event: MouseEvent) => model.onOpenPhoto(event, photo.slug)}
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
                model.coverageAspect,
              )}
              loading="eager"
            />
          {/if}
        </a>
      </div>
    </li>
  {/each}

  {#each Array.from( { length: model.coveragePlaceholderCount }, ) as _, index (`placeholder-${index}`)}
    <li class="min-h-0 min-w-0 bg-surface-muted"></li>
  {/each}
</ul>

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
