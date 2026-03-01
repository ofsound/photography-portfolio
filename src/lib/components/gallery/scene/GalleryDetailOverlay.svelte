<script lang="ts">
  import { fade } from 'svelte/transition';
  import { quartOut } from 'svelte/easing';
  import type { GalleryPhoto } from '$lib/types/content';
  import { GALLERY_DETAIL_SHARED_WIDTH, photoPublicUrl } from '$lib/utils/storage-url';

  type PortalAction = (node: HTMLElement) => { destroy: () => void };

  let {
    activePhoto,
    currentImage,
    promoted,
    transitionPhase,
    controlsVisible,
    overlayChromeHidden,
    isTransitioning,
    canCycleGallery,
    prevGalleryHref,
    nextGalleryHref,
    withCurrentSearch,
    closeToGallery,
    onNeighborNavigate,
    onSelectAdditionalImage,
    portal,
    scaleMaskMs,
    closingChromeMs
  } = $props<{
    activePhoto: GalleryPhoto;
    currentImage: NonNullable<GalleryPhoto['leadImage']>;
    promoted: boolean;
    transitionPhase: string;
    controlsVisible: boolean;
    overlayChromeHidden: boolean;
    isTransitioning: boolean;
    canCycleGallery: boolean;
    prevGalleryHref: string | null;
    nextGalleryHref: string | null;
    withCurrentSearch: (href: string) => string;
    closeToGallery: (event?: MouseEvent | KeyboardEvent) => void;
    onNeighborNavigate: (event: MouseEvent, href: string | null, direction: 'prev' | 'next') => void;
    onSelectAdditionalImage: (event: MouseEvent, imageId: string) => void;
    portal: PortalAction;
    scaleMaskMs: number;
    closingChromeMs: number;
  }>();
</script>

<div
  use:portal
  in:fade={{ duration: transitionPhase === 'open' ? 0 : scaleMaskMs, easing: quartOut }}
  out:fade={{ duration: scaleMaskMs, easing: quartOut }}
  class="fixed inset-0 z-[60] pointer-events-none bg-[var(--color-letterbox)]"
></div>

{#if !promoted && transitionPhase !== 'scale-and-mask'}
  <div
    use:portal
    data-full-viewport
    class="fixed inset-0 z-[65] pointer-events-none flex items-center justify-center p-0 m-0"
    aria-hidden="true"
  >
    <img
      src={photoPublicUrl(currentImage.delivery_storage_path, GALLERY_DETAIL_SHARED_WIDTH)}
      alt={currentImage.alt_text ?? activePhoto.title}
      class="max-h-full max-w-full w-auto h-auto object-contain"
    />
  </div>
{/if}

{#if controlsVisible}
  <div
    use:portal
    class="fixed inset-0 z-[80] pointer-events-none transition-opacity ease-out"
    class:opacity-0={overlayChromeHidden}
    style="transition-duration: {closingChromeMs}ms"
    aria-hidden="true"
  >
    <a
      href={withCurrentSearch('/gallery')}
      onclick={closeToGallery}
      class="chrome-panel pointer-events-auto fixed left-5 top-5 rounded px-3 py-2 text-xs uppercase tracking-[var(--tracking-heading)]"
      class:pointer-events-none={isTransitioning}
      class:opacity-50={isTransitioning}
    >
      Close
    </a>

    {#if canCycleGallery}
      <a
        href={prevGalleryHref ? withCurrentSearch(prevGalleryHref) : '#'}
        onclick={(event) => onNeighborNavigate(event, prevGalleryHref, 'prev')}
        class="chrome-panel pointer-events-auto fixed left-0 top-1/2 -translate-y-1/2 px-4 py-5 text-lg"
        aria-label="Previous image"
      >
        ←
      </a>

      <a
        href={nextGalleryHref ? withCurrentSearch(nextGalleryHref) : '#'}
        onclick={(event) => onNeighborNavigate(event, nextGalleryHref, 'next')}
        class="chrome-panel pointer-events-auto fixed right-0 top-1/2 -translate-y-1/2 px-4 py-5 text-lg"
        aria-label="Next image"
      >
        →
      </a>
    {/if}
  </div>
{/if}

<aside
  use:portal
  class="chrome-panel fixed left-[var(--inset-overlay)] bottom-[var(--inset-overlay)] z-[var(--z-overlay)] w-fit max-w-[min(90vw,var(--max-width-prose))] rounded px-4 py-3 transition-opacity ease-out"
  class:opacity-0={overlayChromeHidden}
  style="transition-duration: {closingChromeMs}ms"
>
  <div class="flex flex-wrap items-center justify-between gap-3">
    <div>
      <h1 class="text-sm uppercase tracking-[var(--tracking-nav)]">{activePhoto.title}</h1>
      {#if activePhoto.description}
        <p class="mt-2 max-w-[var(--max-width-prose)] text-sm text-canvas-text/80">{activePhoto.description}</p>
      {/if}
    </div>
  </div>

  {#if activePhoto.additionalImages.length > 0}
    <div class="flex gap-2 overflow-x-auto px-4 pb-3" data-swipe-ignore>
      {#each activePhoto.additionalImages as image (image.id)}
        <a
          href={withCurrentSearch(`/photo/${activePhoto.slug}/${image.id}`)}
          onclick={(event) => onSelectAdditionalImage(event, image.id)}
          class="block shrink-0 overflow-hidden rounded border border-border-strong"
        >
          <img
            src={photoPublicUrl(image.delivery_storage_path, 180)}
            alt={image.alt_text ?? activePhoto.title}
            class="h-14 w-20 object-cover"
            loading="lazy"
          />
        </a>
      {/each}
    </div>
  {/if}
</aside>
