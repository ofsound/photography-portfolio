<script lang="ts">
  import { resolve } from '$app/paths';
  import { quartOut } from 'svelte/easing';
  import { fade } from 'svelte/transition';
  import { useSwipeGesture } from '$lib/actions/useSwipeGesture.svelte';
  import type { GalleryPhoto } from '$lib/types/content';
  import {
    GALLERY_DETAIL_SHARED_WIDTH,
    photoPublicUrl,
  } from '$lib/utils/storage-url';

  type PortalAction = (node: HTMLElement) => { destroy: () => void };

  const {
    activePhoto,
    currentImage,
    promoted,
    transitionPhase,
    overlayChromeHidden,
    showPhotographInfo,
    isTransitioning,
    canCycleGallery,
    prevGalleryHref,
    nextGalleryHref,
    withCurrentSearch,
    galleryBasePath,
    photoPath,
    onClose,
    onNavigateNeighbor,
    onSelectAdditionalImage,
    onResizePromoted,
    portal,
    scaleMaskMs,
    closingChromeMs,
  } = $props<{
    activePhoto: GalleryPhoto;
    currentImage: NonNullable<GalleryPhoto['leadImage']>;
    promoted: boolean;
    transitionPhase: string;
    overlayChromeHidden: boolean;
    showPhotographInfo: boolean;
    isTransitioning: boolean;
    canCycleGallery: boolean;
    prevGalleryHref: string | null;
    nextGalleryHref: string | null;
    withCurrentSearch: (href: string) => string;
    galleryBasePath: string;
    photoPath: (photoSlug: string, imageId?: string | null) => string;
    onClose: (event?: MouseEvent | KeyboardEvent) => void;
    onNavigateNeighbor: (direction: 'prev' | 'next') => void;
    onSelectAdditionalImage: (imageId: string) => void;
    onResizePromoted: () => void;
    portal: PortalAction;
    scaleMaskMs: number;
    closingChromeMs: number;
  }>();

  let controlsVisible = $state(true);

  const revealControls = () => {
    controlsVisible = true;
  };

  const navigateNeighbor = (
    event: MouseEvent | KeyboardEvent,
    direction: 'prev' | 'next',
  ) => {
    event.preventDefault();
    onNavigateNeighbor(direction);
  };

  const onKeydown = (event: KeyboardEvent) => {
    if (event.repeat) return;

    if (event.key === 'Escape') {
      onClose(event);
      return;
    }

    if (event.key === 'ArrowLeft' && prevGalleryHref) {
      navigateNeighbor(event, 'prev');
      return;
    }

    if (event.key === 'ArrowRight' && nextGalleryHref) {
      navigateNeighbor(event, 'next');
    }
  };

  const onSwipePrev = () => {
    revealControls();
    if (prevGalleryHref) {
      onNavigateNeighbor('prev');
    }
  };

  const onSwipeNext = () => {
    revealControls();
    if (nextGalleryHref) {
      onNavigateNeighbor('next');
    }
  };

  const onAdditionalImageClick = (event: MouseEvent, imageId: string) => {
    event.preventDefault();
    onSelectAdditionalImage(imageId);
  };

  const onResize = () => {
    onResizePromoted();
  };

  $effect(() => {
    if (typeof window === 'undefined') return;
    const vv = window.visualViewport;
    if (!vv) return;

    vv.addEventListener('resize', onResize);
    vv.addEventListener('scroll', onResize);
    return () => {
      vv.removeEventListener('resize', onResize);
      vv.removeEventListener('scroll', onResize);
    };
  });
</script>

<svelte:window
  onresize={onResize}
  onmousemove={revealControls}
  onkeydown={onKeydown}
/>

<div
  use:portal
  use:useSwipeGesture={{
    enabled: canCycleGallery,
    onPrev: onSwipePrev,
    onNext: onSwipeNext,
  }}
  in:fade={{
    duration: transitionPhase === 'open' ? 0 : scaleMaskMs,
    easing: quartOut,
  }}
  out:fade={{ duration: scaleMaskMs, easing: quartOut }}
  class="fixed inset-0 z-[60] cursor-default bg-(--color-letterbox)"
  onclick={(event: MouseEvent) => !isTransitioning && onClose(event)}
  onkeydown={(event: KeyboardEvent) =>
    !isTransitioning &&
    (event.key === 'Enter' || event.key === ' ') &&
    onClose(event)}
  role="button"
  tabindex="-1"
  aria-label="Close photo detail"
></div>

{#if !promoted && transitionPhase !== 'scale-and-mask'}
  <div
    use:portal
    data-full-viewport
    class="pointer-events-none z-[65] m-0 p-0"
    aria-hidden="true"
  >
    <img
      src={photoPublicUrl(
        currentImage.delivery_storage_path,
        GALLERY_DETAIL_SHARED_WIDTH,
      )}
      alt={currentImage.alt_text ?? activePhoto.title}
      class="h-auto max-h-full w-auto max-w-full object-contain"
    />
  </div>
{/if}

{#if controlsVisible}
  <div
    use:portal
    class="pointer-events-none fixed inset-0 z-[80] transition-opacity ease-out"
    class:opacity-0={overlayChromeHidden}
    style="transition-duration: {closingChromeMs}ms"
    aria-hidden="true"
  >
    <a
      href={resolve(withCurrentSearch(galleryBasePath) as `/${string}`)}
      onclick={onClose}
      class="chrome-panel pointer-events-auto fixed top-5 left-5 rounded px-3 py-2 text-xs tracking-wider uppercase"
      class:pointer-events-none={isTransitioning}
      class:opacity-50={isTransitioning}
    >
      Close
    </a>

    {#if canCycleGallery}
      <a
        href={resolve(withCurrentSearch(prevGalleryHref!) as `/${string}`)}
        onclick={(event: MouseEvent) => navigateNeighbor(event, 'prev')}
        class="chrome-panel pointer-events-auto fixed top-1/2 left-0 -translate-y-1/2 px-4 py-5 text-lg"
        aria-label="Previous image"
      >
        ←
      </a>

      <a
        href={resolve(withCurrentSearch(nextGalleryHref!) as `/${string}`)}
        onclick={(event: MouseEvent) => navigateNeighbor(event, 'next')}
        class="chrome-panel pointer-events-auto fixed top-1/2 right-0 -translate-y-1/2 px-4 py-5 text-lg"
        aria-label="Next image"
      >
        →
      </a>
    {/if}
  </div>
{/if}

{#if showPhotographInfo}
  <aside
    use:portal
    class="chrome-panel fixed bottom-[5%] left-[5%] z-[80] w-fit max-w-[90vw] rounded px-4 py-3 transition-opacity ease-out sm:max-w-prose"
    class:opacity-0={overlayChromeHidden}
    style="transition-duration: {closingChromeMs}ms"
  >
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h1 class="text-sm tracking-widest uppercase">
          {activePhoto.title}
        </h1>
        {#if activePhoto.description}
          <p class="mt-2 max-w-prose text-sm text-canvas-text/80">
            {activePhoto.description}
          </p>
        {/if}
      </div>
    </div>

    {#if activePhoto.additionalImages.length > 0}
      <div class="flex gap-2 overflow-x-auto px-4 pb-3" data-swipe-ignore>
        {#each activePhoto.additionalImages as image (image.id)}
          <a
            href={resolve(
              withCurrentSearch(
                photoPath(activePhoto.slug, image.id),
              ) as `/${string}`,
            )}
            onclick={(event: MouseEvent) =>
              onAdditionalImageClick(event, image.id)}
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
{/if}
