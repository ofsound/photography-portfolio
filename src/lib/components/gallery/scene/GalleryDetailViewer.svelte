<script lang="ts">
  import { onMount } from 'svelte';
  import { fromAction } from 'svelte/attachments';
  import { resolve } from '$app/paths';
  import { quartOut } from 'svelte/easing';
  import { fade } from 'svelte/transition';

  import { useSwipeGesture } from '$lib/actions/useSwipeGesture.svelte';
  import {
    GALLERY_DETAIL_SHARED_WIDTH,
    photoPublicUrl,
  } from '$lib/utils/storage-url';

  import type { NavButtonPreset } from '$lib/constants/nav-button-preset';
  import type { GalleryPhoto } from '$lib/types/content';
  import type {
    DetailViewMode,
    PhotographInfoMode,
  } from './gallery-scene.types';

  type PortalAction = (node: HTMLElement) => { destroy: () => void };

  const {
    activePhoto,
    currentImage,
    promoted,
    galleryName,
    detailViewMode,
    activePosition,
    totalPhotos,
    supportsAdditionalImages,
    transitionPhase,
    overlayChromeHidden,
    photographInfoMode,
    showPhotoInfoTitle,
    showPhotoInfoDescription,
    showPhotoInfoCaptureDate,
    showPhotoInfoDimensions,
    showPhotoInfoLicenseText,
    isTransitioning,
    canCycleGallery,
    navButtonPreset,
    prevGalleryHref,
    nextGalleryHref,
    withCurrentSearch,
    galleryBasePath,
    photoPath,
    onClose,
    onNavigateNeighbor,
    onSelectAdditionalImage,
    onResizePromoted,
    onBottomDockInsetChange,
    portal,
    scaleMaskMs,
    closingChromeMs,
  } = $props<{
    activePhoto: GalleryPhoto;
    currentImage: NonNullable<GalleryPhoto['leadImage']>;
    promoted: boolean;
    detailViewMode: DetailViewMode;
    activePosition: number;
    totalPhotos: number;
    supportsAdditionalImages: boolean;
    transitionPhase: string;
    overlayChromeHidden: boolean;
    photographInfoMode: PhotographInfoMode;
    showPhotoInfoTitle: boolean;
    showPhotoInfoDescription: boolean;
    showPhotoInfoCaptureDate: boolean;
    showPhotoInfoDimensions: boolean;
    showPhotoInfoLicenseText: boolean;
    isTransitioning: boolean;
    canCycleGallery: boolean;
    navButtonPreset: NavButtonPreset;
    prevGalleryHref: string | null;
    nextGalleryHref: string | null;
    withCurrentSearch: (href: string) => string;
    galleryBasePath: string;
    photoPath: (photoSlug: string, imageId?: string | null) => string;
    onClose: (event?: MouseEvent | KeyboardEvent) => void;
    onNavigateNeighbor: (direction: 'prev' | 'next') => void;
    onSelectAdditionalImage: (imageId: string) => void;
    onResizePromoted: () => void;
    onBottomDockInsetChange: (insetPx: number) => void;
    portal: PortalAction;
    scaleMaskMs: number;
    closingChromeMs: number;
    galleryName: string;
  }>();

  let controlsVisible = $state(true);
  let bottomDockInsetPx = $state(0);

  const hasText = (value: string | null | undefined) =>
    Boolean(value && value.trim().length > 0);

  const galleryHeaderText = $derived(galleryName.trim());
  const titleText = $derived(activePhoto.title.trim());
  const descriptionText = $derived((activePhoto.description ?? '').trim());
  const captureDateText = $derived((activePhoto.capture_date ?? '').trim());
  const dimensionsText = $derived((activePhoto.dimensions ?? '').trim());
  const licenseText = $derived((activePhoto.license_text ?? '').trim());

  const showTitle = $derived(showPhotoInfoTitle && hasText(titleText));
  const showDescription = $derived(
    showPhotoInfoDescription && hasText(descriptionText),
  );
  const showCaptureDate = $derived(
    showPhotoInfoCaptureDate && hasText(captureDateText),
  );
  const showDimensions = $derived(
    showPhotoInfoDimensions && hasText(dimensionsText),
  );
  const showLicense = $derived(
    showPhotoInfoLicenseText && hasText(licenseText),
  );
  const isContactSheet = $derived(detailViewMode === 'contact_sheet');
  const showAnyText = $derived(
    showTitle ||
      showDescription ||
      showCaptureDate ||
      showDimensions ||
      showLicense,
  );
  const showAdditionalStrip = $derived(
    supportsAdditionalImages && activePhoto.additionalImages.length > 0,
  );
  const isBottomDock = $derived(photographInfoMode === 'bottom_dock');
  const showInfoShell = $derived(
    !isContactSheet &&
      photographInfoMode !== 'hidden' &&
      (showAnyText || showAdditionalStrip),
  );

  const detailViewportStyle = $derived(
    isBottomDock && showInfoShell
      ? `--detail-bottom-inset: ${bottomDockInsetPx}px;`
      : '--detail-bottom-inset: 0px;',
  );

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

  const setBottomDockInset = (value: number) => {
    const next = Math.max(0, Math.round(value));
    if (next === bottomDockInsetPx) return;
    bottomDockInsetPx = next;
    onBottomDockInsetChange(next);
  };

  const observeBottomDock = (node: HTMLElement, enabled: boolean) => {
    let isEnabled = enabled;
    let observer: ResizeObserver | null = null;

    const syncInset = () => {
      if (!isEnabled) {
        setBottomDockInset(0);
        return;
      }

      setBottomDockInset(node.getBoundingClientRect().height);
    };

    const start = () => {
      syncInset();

      if (!isEnabled || typeof ResizeObserver === 'undefined') return;
      observer = new ResizeObserver(syncInset);
      observer.observe(node);
    };

    start();

    return {
      update(nextEnabled: boolean) {
        isEnabled = nextEnabled;
        observer?.disconnect();
        observer = null;
        start();
      },
      destroy() {
        observer?.disconnect();
        setBottomDockInset(0);
      },
    };
  };

  onMount(() => {
    const vv = window.visualViewport;
    if (!vv) return;

    vv.addEventListener('resize', onResizePromoted);
    vv.addEventListener('scroll', onResizePromoted);
    return () => {
      vv.removeEventListener('resize', onResizePromoted);
      vv.removeEventListener('scroll', onResizePromoted);
    };
  });
</script>

<svelte:window
  onresize={onResizePromoted}
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
  out:fade={{ duration: isContactSheet ? 0 : scaleMaskMs, easing: quartOut }}
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

{#if !isContactSheet && !promoted && transitionPhase !== 'scale-and-mask'}
  <div
    use:portal
    data-full-viewport
    class="pointer-events-none z-[65] m-0 p-0"
    style={detailViewportStyle}
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
    class:nav-controls--transitioning={isTransitioning}
    class:opacity-0={overlayChromeHidden}
    style="transition-duration: {closingChromeMs}ms"
    aria-hidden="true"
  >
    <a
      href={resolve(withCurrentSearch(galleryBasePath) as `/${string}`)}
      onclick={onClose}
      class="nav-btn nav-btn--close nav-btn--{navButtonPreset} pointer-events-auto"
      class:pointer-events-none={isTransitioning}
      aria-label="Close photo detail"
    >
      {#if navButtonPreset === 'whisper'}
        <svg
          class="nav-btn__close-glyph"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.5"
          aria-hidden="true"
        >
          <path d="M6 6L18 18" />
          <path d="M18 6L6 18" />
        </svg>
      {:else if navButtonPreset === 'lens'}
        <span class="nav-btn__ring" aria-hidden="true">
          <svg
            class="nav-btn__close-glyph"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.75"
          >
            <path d="M7 7L17 17" />
            <path d="M17 7L7 17" />
          </svg>
        </span>
      {:else if navButtonPreset === 'filmStrip'}
        <span class="nav-btn__strip" aria-hidden="true">
          <span class="nav-btn__sprocket"></span>
          <svg
            class="nav-btn__close-glyph"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.75"
          >
            <path d="M7 7L17 17" />
            <path d="M17 7L7 17" />
          </svg>
          <span class="nav-btn__sprocket"></span>
        </span>
      {:else if navButtonPreset === 'cinemark'}
        <span class="nav-btn__close-word" aria-hidden="true">Close</span>
      {:else if navButtonPreset === 'gate'}
        <span class="nav-btn__curtain" aria-hidden="true">
          <span class="nav-btn__close-word">Close</span>
        </span>
      {/if}
    </a>

    {#if canCycleGallery}
      <!-- Prev button -->
      <a
        href={resolve(withCurrentSearch(prevGalleryHref!) as `/${string}`)}
        onclick={(event: MouseEvent) => navigateNeighbor(event, 'prev')}
        class="nav-btn nav-btn--prev nav-btn--{navButtonPreset} pointer-events-auto"
        aria-label="Previous image"
      >
        {#if navButtonPreset === 'whisper'}
          <svg
            class="nav-btn__chevron"
            viewBox="0 0 24 48"
            fill="none"
            stroke="currentColor"
            stroke-width="1"><path d="M18 4L6 24L18 44" /></svg
          >
        {:else if navButtonPreset === 'lens'}
          <span class="nav-btn__ring">
            <svg
              class="nav-btn__chevron"
              viewBox="0 0 24 48"
              fill="none"
              stroke="currentColor"
              stroke-width="1.5"><path d="M16 8L8 24L16 40" /></svg
            >
          </span>
        {:else if navButtonPreset === 'filmStrip'}
          <span class="nav-btn__strip">
            <span class="nav-btn__sprocket"></span>
            <svg
              class="nav-btn__chevron"
              viewBox="0 0 24 48"
              fill="none"
              stroke="currentColor"
              stroke-width="1.5"><path d="M16 12L8 24L16 36" /></svg
            >
            <span class="nav-btn__sprocket"></span>
          </span>
        {:else if navButtonPreset === 'cinemark'}
          <svg class="nav-btn__chevron" viewBox="0 0 32 48" fill="currentColor"
            ><path d="M26 4L4 24L26 44L26 38L12 24L26 10Z" /></svg
          >
        {:else if navButtonPreset === 'gate'}
          <span class="nav-btn__curtain">
            <svg
              class="nav-btn__chevron"
              viewBox="0 0 24 48"
              fill="none"
              stroke="currentColor"
              stroke-width="2"><path d="M16 12L8 24L16 36" /></svg
            >
          </span>
        {/if}
      </a>

      <!-- Next button -->
      <a
        href={resolve(withCurrentSearch(nextGalleryHref!) as `/${string}`)}
        onclick={(event: MouseEvent) => navigateNeighbor(event, 'next')}
        class="nav-btn nav-btn--next nav-btn--{navButtonPreset} pointer-events-auto"
        aria-label="Next image"
      >
        {#if navButtonPreset === 'whisper'}
          <svg
            class="nav-btn__chevron"
            viewBox="0 0 24 48"
            fill="none"
            stroke="currentColor"
            stroke-width="1"><path d="M6 4L18 24L6 44" /></svg
          >
        {:else if navButtonPreset === 'lens'}
          <span class="nav-btn__ring">
            <svg
              class="nav-btn__chevron"
              viewBox="0 0 24 48"
              fill="none"
              stroke="currentColor"
              stroke-width="1.5"><path d="M8 8L16 24L8 40" /></svg
            >
          </span>
        {:else if navButtonPreset === 'filmStrip'}
          <span class="nav-btn__strip">
            <span class="nav-btn__sprocket"></span>
            <svg
              class="nav-btn__chevron"
              viewBox="0 0 24 48"
              fill="none"
              stroke="currentColor"
              stroke-width="1.5"><path d="M8 12L16 24L8 36" /></svg
            >
            <span class="nav-btn__sprocket"></span>
          </span>
        {:else if navButtonPreset === 'cinemark'}
          <svg class="nav-btn__chevron" viewBox="0 0 32 48" fill="currentColor"
            ><path d="M6 4L28 24L6 44L6 38L20 24L6 10Z" /></svg
          >
        {:else if navButtonPreset === 'gate'}
          <span class="nav-btn__curtain">
            <svg
              class="nav-btn__chevron"
              viewBox="0 0 24 48"
              fill="none"
              stroke="currentColor"
              stroke-width="2"><path d="M8 12L16 24L8 36" /></svg
            >
          </span>
        {/if}
      </a>
    {/if}
  </div>
{/if}

{#if isContactSheet}
  <aside
    use:portal
    class="chrome-panel fixed top-4 right-4 z-[80] max-w-[min(92vw,24rem)] rounded-xl border border-border-strong px-4 py-3 shadow-xl transition-opacity ease-out sm:top-6 sm:right-6"
    class:opacity-0={overlayChromeHidden}
    style="transition-duration: {closingChromeMs}ms"
  >
    <div class="grid gap-1">
      <p class="text-[0.65rem] tracking-[0.24em] text-canvas-text/65 uppercase">
        {galleryHeaderText}
        {#if activePosition > 0 && totalPhotos > 0}
          <span class="ml-2 text-canvas-text/50">
            {activePosition}/{totalPhotos}
          </span>
        {/if}
      </p>
      <h1 class="text-sm font-semibold tracking-wide text-canvas-text">
        {titleText}
      </h1>
    </div>
  </aside>
{/if}

{#if showInfoShell && photographInfoMode === 'floating'}
  <aside
    use:portal
    class="chrome-panel fixed bottom-4 left-4 z-[80] w-[min(92vw,40rem)] rounded-xl border border-border-strong px-4 py-4 shadow-xl transition-opacity ease-out sm:bottom-6 sm:left-6"
    class:opacity-0={overlayChromeHidden}
    style="transition-duration: {closingChromeMs}ms"
  >
    {#if showAnyText}
      <div class="grid gap-2">
        {#if showTitle}
          <h1 class="text-sm font-semibold tracking-widest uppercase">
            {titleText}
          </h1>
        {/if}
        {#if showDescription}
          <p class="text-sm leading-relaxed text-canvas-text/85">
            {descriptionText}
          </p>
        {/if}
        {#if showCaptureDate}
          <p class="text-sm text-canvas-text/90">
            <span
              class="mr-2 text-xs tracking-wide text-canvas-text/65 uppercase"
              >Date</span
            >
            {captureDateText}
          </p>
        {/if}
        {#if showDimensions}
          <p class="text-sm text-canvas-text/90">
            <span
              class="mr-2 text-xs tracking-wide text-canvas-text/65 uppercase"
              >Dimensions</span
            >
            {dimensionsText}
          </p>
        {/if}
        {#if showLicense}
          <p class="text-sm text-canvas-text/90">
            <span
              class="mr-2 text-xs tracking-wide text-canvas-text/65 uppercase"
              >License</span
            >
            {licenseText}
          </p>
        {/if}
      </div>
    {/if}

    {#if showAdditionalStrip}
      <div class="mt-3 flex gap-2 overflow-x-auto pb-1" data-swipe-ignore>
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
{:else if showInfoShell && photographInfoMode === 'bottom_dock'}
  <aside
    use:portal
    {@attach fromAction(observeBottomDock, () => showInfoShell && isBottomDock)}
    class="chrome-panel fixed right-0 bottom-0 left-0 z-[80] border-t border-border-strong px-4 pt-3 pb-4 transition-opacity ease-out"
    class:opacity-0={overlayChromeHidden}
    style="transition-duration: {closingChromeMs}ms"
  >
    <div
      class="mx-auto grid max-h-[38vh] w-full max-w-6xl gap-3 overflow-y-auto sm:max-h-[34vh]"
    >
      {#if showAnyText}
        <div class="grid gap-2">
          {#if showTitle}
            <h1 class="text-sm font-semibold tracking-widest uppercase">
              {titleText}
            </h1>
          {/if}
          {#if showDescription}
            <p class="text-sm leading-relaxed text-canvas-text/85">
              {descriptionText}
            </p>
          {/if}
          {#if showCaptureDate}
            <p class="text-sm text-canvas-text/90">
              <span
                class="mr-2 text-xs tracking-wide text-canvas-text/65 uppercase"
                >Date</span
              >
              {captureDateText}
            </p>
          {/if}
          {#if showDimensions}
            <p class="text-sm text-canvas-text/90">
              <span
                class="mr-2 text-xs tracking-wide text-canvas-text/65 uppercase"
                >Dimensions</span
              >
              {dimensionsText}
            </p>
          {/if}
          {#if showLicense}
            <p class="text-sm text-canvas-text/90">
              <span
                class="mr-2 text-xs tracking-wide text-canvas-text/65 uppercase"
                >License</span
              >
              {licenseText}
            </p>
          {/if}
        </div>
      {/if}

      {#if showAdditionalStrip}
        <div class="flex gap-2 overflow-x-auto pb-1" data-swipe-ignore>
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
    </div>
  </aside>
{/if}
