<script lang="ts">
  /* eslint-disable svelte/no-navigation-without-resolve -- withCurrentSearch resolves internally */
  import { parseDimensions } from '$lib/utils/parse-dimensions';
  import { SvelteMap } from 'svelte/reactivity';
  import {
    GALLERY_DETAIL_SHARED_WIDTH,
    photoPublicUrl,
  } from '$lib/utils/storage-url';
  import type { GalleryPhoto } from '$lib/types/content';
  import type { BinResult } from '$lib/utils/bin-solver';

  type GalleryImage = NonNullable<GalleryPhoto['leadImage']>;
  const CASCADE_STAGGER_MS = 42;

  const {
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
    tileAspectRatio,
    coverageRows,
    coverageCols,
    coverageAspect,
    coveragePlaceholderCount,
    binsResult,
    columnsResult,
    showThumbnailZoomHover,
  } = $props<{
    photos: GalleryPhoto[];
    layoutMode: 'uniform' | 'masonry' | 'coverage' | 'bins' | 'columns';
    colCount: number;
    gap: number;
    uniformRatio: number;
    placeholderCount: number;
    isLoadingMore: boolean;
    galleryRevealed: boolean;
    reducedMotion: boolean;
    withCurrentSearch: (href: string) => string;
    onOpenPhoto: (event: MouseEvent, slug: string) => void;
    registerTile: (
      node: HTMLElement,
      slug: string,
    ) => { update?: (slug: string) => void; destroy?: () => void };
    hasThumbCrop: (img: GalleryImage | null) => boolean;
    thumbCropStyle: (
      img: GalleryImage | null,
      containerAspect: number,
    ) => string;
    tileAspectRatio: (photo: GalleryPhoto) => number;
    coverageRows: number;
    coverageCols: number;
    coverageAspect: number;
    coveragePlaceholderCount: number;
    binsResult: BinResult | null;
    columnsResult: BinResult | null;
    showThumbnailZoomHover: boolean;
  }>();

  /** Lookup map from photo id to GalleryPhoto for bins mode. */
  const photosById = $derived.by<SvelteMap<string, GalleryPhoto>>(() => {
    const m = new SvelteMap<string, GalleryPhoto>();
    for (const p of photos) m.set(p.id, p);
    return m;
  });
</script>

{#if layoutMode === 'uniform'}
  <ul
    class="grid"
    style={`grid-template-columns: repeat(${colCount}, minmax(0, 1fr)); gap: ${gap}px;`}
  >
    {#each photos as photo, index (photo.id)}
      <li>
        <div
          class="tile-cascade"
          class:revealed={galleryRevealed}
          class:no-motion={reducedMotion}
          style="animation-delay: {galleryRevealed && !reducedMotion
            ? index * CASCADE_STAGGER_MS
            : 0}ms"
        >
          <a
            href={withCurrentSearch(`/photo/${photo.slug}`)}
            use:registerTile={photo.slug}
            class="group relative block overflow-hidden"
            style={`aspect-ratio: ${uniformRatio};`}
            onclick={(event: MouseEvent) => onOpenPhoto(event, photo.slug)}
          >
            {#if photo.leadImage}
              <img
                src={photoPublicUrl(
                  photo.leadImage.delivery_storage_path,
                  GALLERY_DETAIL_SHARED_WIDTH,
                )}
                alt={photo.leadImage.alt_text ?? photo.title}
                class="block h-full w-full object-cover transition-transform duration-500 ease-cinematic {hasThumbCrop(
                  photo.leadImage,
                )
                  ? 'tile-img-crop'
                  : showThumbnailZoomHover
                    ? 'group-hover:scale-[1.03]'
                    : ''}"
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
        <li
          class="animate-pulse bg-surface-muted"
          style={`aspect-ratio: ${uniformRatio};`}
        ></li>
      {/each}
    {/if}
  </ul>
{:else if layoutMode === 'coverage'}
  <ul
    class="grid h-full w-full"
    style={`grid-template-columns: repeat(${coverageCols}, minmax(0, 1fr)); grid-template-rows: repeat(${coverageRows}, minmax(0, 1fr)); gap: ${gap}px;`}
  >
    {#each photos as photo, index (photo.id)}
      <li class="min-h-0 min-w-0">
        <div
          class="tile-cascade h-full"
          class:revealed={galleryRevealed}
          class:no-motion={reducedMotion}
          style="animation-delay: {galleryRevealed && !reducedMotion
            ? index * CASCADE_STAGGER_MS
            : 0}ms"
        >
          <a
            href={withCurrentSearch(`/photo/${photo.slug}`)}
            use:registerTile={photo.slug}
            class="group relative block h-full w-full overflow-hidden"
            onclick={(event: MouseEvent) => onOpenPhoto(event, photo.slug)}
          >
            {#if photo.leadImage}
              <img
                src={photoPublicUrl(
                  photo.leadImage.delivery_storage_path,
                  GALLERY_DETAIL_SHARED_WIDTH,
                )}
                alt={photo.leadImage.alt_text ?? photo.title}
                class="block h-full w-full object-cover transition-transform duration-500 ease-cinematic {hasThumbCrop(
                  photo.leadImage,
                )
                  ? 'tile-img-crop'
                  : showThumbnailZoomHover
                    ? 'group-hover:scale-[1.03]'
                    : ''}"
                style={thumbCropStyle(photo.leadImage, coverageAspect)}
                loading="eager"
              />
            {/if}
          </a>
        </div>
      </li>
    {/each}

    {#each Array.from( { length: coveragePlaceholderCount }, ) as _, index (`placeholder-${index}`)}
      <li class="min-h-0 min-w-0 bg-surface-muted"></li>
    {/each}
  </ul>
{:else if layoutMode === 'bins'}
  {#if binsResult}
    <ul class="flex h-full w-full flex-col" style={`gap: ${gap}px;`}>
      {#each binsResult.rows as row, rowIdx (`bins-row-${rowIdx}`)}
        <li class="flex min-h-0 flex-1" style={`gap: ${gap}px;`}>
          {#each row.photos as entry, entryIdx (`bins-${entry.id}`)}
            {@const photo = photosById.get(entry.id)}
            {#if photo}
              {@const cascadeIdx =
                rowIdx * (binsResult.rows[0]?.photos.length ?? 1) + entryIdx}
              <div
                class="tile-cascade min-w-0"
                class:revealed={galleryRevealed}
                class:no-motion={reducedMotion}
                style="flex: {entry.displayAspect} 1 0%; animation-delay: {galleryRevealed &&
                !reducedMotion
                  ? cascadeIdx * CASCADE_STAGGER_MS
                  : 0}ms"
              >
                <a
                  href={withCurrentSearch(`/photo/${photo.slug}`)}
                  use:registerTile={photo.slug}
                  class="group relative block h-full w-full overflow-hidden"
                  onclick={(event: MouseEvent) =>
                    onOpenPhoto(event, photo.slug)}
                >
                  {#if photo.leadImage}
                    <img
                      src={photoPublicUrl(
                        photo.leadImage.delivery_storage_path,
                        GALLERY_DETAIL_SHARED_WIDTH,
                      )}
                      alt={photo.leadImage.alt_text ?? photo.title}
                      class="block h-full w-full object-cover transition-transform duration-500 ease-cinematic {hasThumbCrop(
                        photo.leadImage,
                      )
                        ? 'tile-img-crop'
                        : 'group-hover:scale-[1.03]'}"
                      style={thumbCropStyle(
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
{:else if layoutMode === 'columns'}
  {#if columnsResult}
    <ul class="flex h-full w-full flex-row" style={`gap: ${gap}px;`}>
      {#each columnsResult.rows as col, colIdx (`cols-col-${colIdx}`)}
        <li class="flex min-w-0 flex-1 flex-col" style={`gap: ${gap}px;`}>
          {#each col.photos as entry, entryIdx (`cols-${entry.id}`)}
            {@const photo = photosById.get(entry.id)}
            {#if photo}
              {@const cascadeIdx =
                colIdx * (columnsResult.rows[0]?.photos.length ?? 1) + entryIdx}
              <div
                class="tile-cascade min-h-0"
                class:revealed={galleryRevealed}
                class:no-motion={reducedMotion}
                style="flex: {1 /
                  entry.displayAspect} 1 0%; animation-delay: {galleryRevealed &&
                !reducedMotion
                  ? cascadeIdx * CASCADE_STAGGER_MS
                  : 0}ms"
              >
                <a
                  href={withCurrentSearch(`/photo/${photo.slug}`)}
                  use:registerTile={photo.slug}
                  class="group relative block h-full w-full overflow-hidden"
                  onclick={(event: MouseEvent) =>
                    onOpenPhoto(event, photo.slug)}
                >
                  {#if photo.leadImage}
                    <img
                      src={photoPublicUrl(
                        photo.leadImage.delivery_storage_path,
                        GALLERY_DETAIL_SHARED_WIDTH,
                      )}
                      alt={photo.leadImage.alt_text ?? photo.title}
                      class="block h-full w-full object-cover transition-transform duration-500 ease-cinematic {hasThumbCrop(
                        photo.leadImage,
                      )
                        ? 'tile-img-crop'
                        : 'group-hover:scale-[1.03]'}"
                      style={thumbCropStyle(
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
{:else}
  <ul
    class="columns-2 md:columns-4 lg:columns-6"
    style={`columns: ${colCount}; column-gap: ${gap}px;`}
  >
    {#each photos as photo, index (photo.id)}
      {#if photo.leadImage}
        {@const knownRatio = parseDimensions(photo.leadImage.dimensions)}
        <li class="break-inside-avoid" style="margin-bottom: {gap}px">
          <div
            class="tile-cascade"
            class:revealed={galleryRevealed}
            class:no-motion={reducedMotion}
            style="animation-delay: {galleryRevealed && !reducedMotion
              ? index * CASCADE_STAGGER_MS
              : 0}ms"
          >
            <a
              href={withCurrentSearch(`/photo/${photo.slug}`)}
              use:registerTile={photo.slug}
              class="group relative block overflow-hidden"
              style={knownRatio
                ? `aspect-ratio: ${knownRatio.width / knownRatio.height};`
                : ''}
              onclick={(event: MouseEvent) => onOpenPhoto(event, photo.slug)}
            >
              <img
                src={photoPublicUrl(
                  photo.leadImage.delivery_storage_path,
                  GALLERY_DETAIL_SHARED_WIDTH,
                )}
                alt={photo.leadImage.alt_text ?? photo.title}
                class="block h-auto w-full object-cover transition-transform duration-500 ease-cinematic {hasThumbCrop(
                  photo.leadImage,
                )
                  ? 'tile-img-crop'
                  : showThumbnailZoomHover
                    ? 'group-hover:scale-[1.02]'
                    : ''}"
                style={thumbCropStyle(photo.leadImage, tileAspectRatio(photo))}
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

    {#if isLoadingMore}
      {#each Array.from({ length: placeholderCount }) as _, index (index)}
        <li
          class="animate-pulse break-inside-avoid bg-surface-muted"
          style={`height: ${120 + (index % 5) * 34}px; margin-bottom: ${gap}px;`}
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
