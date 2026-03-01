<script lang="ts">
  import { parseDimensions } from '$lib/utils/parse-dimensions';
  import { GALLERY_DETAIL_SHARED_WIDTH, photoPublicUrl } from '$lib/utils/storage-url';
  import type { GalleryPhoto } from '$lib/types/content';

  type GalleryImage = NonNullable<GalleryPhoto['leadImage']>;
  const CASCADE_STAGGER_MS = 42;

  let {
    photos,
    layoutMode,
    colCount,
    gap,
    uniformRatio,
    placeholderCount,
    isLoadingMore,
    galleryRevealed,
    reducedMotion,
    withCurrentSearch,
    onOpenPhoto,
    registerTile,
    hasThumbCrop,
    thumbCropStyle,
    tileAspectRatio
  } = $props<{
    photos: GalleryPhoto[];
    layoutMode: 'uniform' | 'masonry';
    colCount: number;
    gap: number;
    uniformRatio: number;
    placeholderCount: number;
    isLoadingMore: boolean;
    galleryRevealed: boolean;
    reducedMotion: boolean;
    withCurrentSearch: (href: string) => string;
    onOpenPhoto: (event: MouseEvent, slug: string) => void;
    registerTile: (node: HTMLElement, slug: string) => { update?: (slug: string) => void; destroy?: () => void };
    hasThumbCrop: (img: GalleryImage | null) => boolean;
    thumbCropStyle: (img: GalleryImage | null, containerAspect: number) => string;
    tileAspectRatio: (photo: GalleryPhoto) => number;
  }>();
</script>

{#if layoutMode === 'uniform'}
  <ul class="grid" style={`grid-template-columns: repeat(${colCount}, minmax(0, 1fr)); gap: ${gap}px;`}>
    {#each photos as photo, index (photo.id)}
      <li>
        <div
          class="tile-cascade"
          class:revealed={galleryRevealed}
          class:no-motion={reducedMotion}
          style="animation-delay: {galleryRevealed && !reducedMotion ? index * CASCADE_STAGGER_MS : 0}ms"
        >
          <a
            href={withCurrentSearch(`/photo/${photo.slug}`)}
            use:registerTile={photo.slug}
            class="group relative block overflow-hidden rounded"
            style={`aspect-ratio: ${uniformRatio};`}
            onclick={(event: MouseEvent) => onOpenPhoto(event, photo.slug)}
          >
            {#if photo.leadImage}
              <img
                src={photoPublicUrl(photo.leadImage.delivery_storage_path, GALLERY_DETAIL_SHARED_WIDTH)}
                alt={photo.leadImage.alt_text ?? photo.title}
                class="tile-img transition-transform duration-500 ease-cinematic {hasThumbCrop(photo.leadImage) ? 'tile-img-crop' : 'group-hover:scale-[1.03]'}"
                style={thumbCropStyle(photo.leadImage, uniformRatio)}
                loading="eager"
              />
            {/if}
          </a>
        </div>
      </li>
    {/each}

    {#if isLoadingMore}
      {#each Array.from({ length: placeholderCount }) as _, index (index)}
        <li class="animate-pulse rounded bg-surface-muted" style={`aspect-ratio: ${uniformRatio};`}></li>
      {/each}
    {/if}
  </ul>
{:else}
  <ul class="columns-2 md:columns-4 lg:columns-6" style={`columns: ${colCount}; column-gap: ${gap}px;`}>
    {#each photos as photo, index (photo.id)}
      {#if photo.leadImage}
        {@const knownRatio = parseDimensions(photo.leadImage.dimensions)}
        <li class="break-inside-avoid" style="margin-bottom: {gap}px">
          <div
            class="tile-cascade"
            class:revealed={galleryRevealed}
            class:no-motion={reducedMotion}
            style="animation-delay: {galleryRevealed && !reducedMotion ? index * CASCADE_STAGGER_MS : 0}ms"
          >
            <a
              href={withCurrentSearch(`/photo/${photo.slug}`)}
              use:registerTile={photo.slug}
              class="group relative block overflow-hidden rounded"
              style={knownRatio ? `aspect-ratio: ${knownRatio.width / knownRatio.height};` : ''}
              onclick={(event: MouseEvent) => onOpenPhoto(event, photo.slug)}
            >
              <img
                src={photoPublicUrl(photo.leadImage.delivery_storage_path, GALLERY_DETAIL_SHARED_WIDTH)}
                alt={photo.leadImage.alt_text ?? photo.title}
                class="tile-img tile-img-masonry transition-transform duration-500 ease-cinematic {hasThumbCrop(photo.leadImage) ? 'tile-img-crop' : 'group-hover:scale-[1.02]'}"
                style={thumbCropStyle(photo.leadImage, tileAspectRatio(photo))}
                loading="eager"
                onload={(event) => {
                  if (!knownRatio && event.currentTarget instanceof HTMLImageElement) {
                    const img = event.currentTarget;
                    const anchor = img.closest('a');
                    if (anchor && img.naturalWidth && img.naturalHeight) {
                      anchor.style.aspectRatio = String(img.naturalWidth / img.naturalHeight);
                    }
                  }
                }}
              />
            </a>
          </div>
        </li>
      {/if}
    {/each}

    {#if isLoadingMore}
      {#each Array.from({ length: placeholderCount }) as _, index (index)}
        <li
          class="break-inside-avoid animate-pulse rounded bg-surface-muted"
          style={`height: ${120 + (index % 5) * 34}px; margin-bottom: ${gap}px;`}
        ></li>
      {/each}
    {/if}
  </ul>
{/if}

<style>
  .tile-img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }

  .tile-img-masonry {
    height: auto;
  }

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
