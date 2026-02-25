<script lang="ts">
  import { photoPublicUrl } from '$lib/utils/storage-url';
  import { goto } from '$app/navigation';
  import { readGalleryReturnState, storeViewTransitionHint } from '$lib/utils/view-transition';

  type Image = {
    id: string;
    kind: 'lead' | 'additional';
    position: number;
    delivery_storage_path: string;
    alt_text: string | null;
  };

  let { photoSlug, title, description, currentImage, leadImage, additionalImages, prevGalleryHref, nextGalleryHref } = $props<{
    photoSlug: string;
    title: string;
    description: string | null;
    currentImage: Image;
    leadImage: Image;
    additionalImages: Image[];
    prevGalleryHref: string | null;
    nextGalleryHref: string | null;
  }>();

  let controlsVisible = $state(true);
  let metaMinimized = $state(false);
  let hideTimer: ReturnType<typeof setTimeout> | undefined;
  let touchStartX = $state(0);
  let touchStartY = $state(0);
  let touchStartedAt = $state(0);
  let touchActive = $state(false);

  const canCycleGallery = $derived(Boolean(prevGalleryHref && nextGalleryHref));
  const swipeMinDistance = 48;
  const swipeMaxDurationMs = 700;

  const routeForImage = (image: Image) => {
    if (image.id === leadImage.id) {
      return `/photo/${photoSlug}`;
    }
    return `/photo/${photoSlug}/${image.id}`;
  };

  const scheduleControlsHide = () => {
    if (hideTimer) clearTimeout(hideTimer);
    hideTimer = setTimeout(() => {
      controlsVisible = false;
    }, 1800);
  };

  const revealControls = () => {
    controlsVisible = true;
    scheduleControlsHide();
  };

  const navigateToGallery = (href: string, direction?: 'next' | 'prev') => {
    storeViewTransitionHint({
      kind: 'detail-to-detail',
      direction
    });
    goto(href, { noScroll: true, keepFocus: true });
  };

  const prepareCloseTransition = () => {
    storeViewTransitionHint({ kind: 'detail-to-gallery' });
  };

  const closeToGallery = () => {
    prepareCloseTransition();
    const snapshot = readGalleryReturnState();
    const target = snapshot?.url ?? '/gallery';
    goto(target, { noScroll: true, keepFocus: true });
  };

  const onCloseClick = (event: MouseEvent) => {
    event.preventDefault();
    closeToGallery();
  };

  const prepareDetailTransition = (direction?: 'next' | 'prev') => {
    storeViewTransitionHint({
      kind: 'detail-to-detail',
      direction
    });
  };

  const onPointerMove = () => {
    revealControls();
  };

  const onKeydown = (event: KeyboardEvent) => {
    if (event.key === 'ArrowLeft') {
      if (!prevGalleryHref) return;
      event.preventDefault();
      navigateToGallery(prevGalleryHref, 'prev');
    }
    if (event.key === 'ArrowRight') {
      if (!nextGalleryHref) return;
      event.preventDefault();
      navigateToGallery(nextGalleryHref, 'next');
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      closeToGallery();
    }
  };

  const shouldIgnoreSwipe = (target: EventTarget | null) => target instanceof HTMLElement && !!target.closest('[data-swipe-ignore]');

  const onTouchStart = (event: TouchEvent) => {
    if (shouldIgnoreSwipe(event.target)) {
      touchActive = false;
      return;
    }

    if (event.touches.length !== 1) {
      touchActive = false;
      return;
    }

    const touch = event.touches[0];
    touchStartX = touch.clientX;
    touchStartY = touch.clientY;
    touchStartedAt = Date.now();
    touchActive = true;
    revealControls();
  };

  const onTouchEnd = (event: TouchEvent) => {
    if (!touchActive) return;
    touchActive = false;
    if (!canCycleGallery) return;

    const touch = event.changedTouches[0];
    if (!touch) return;

    const deltaX = touch.clientX - touchStartX;
    const deltaY = touch.clientY - touchStartY;
    const elapsed = Date.now() - touchStartedAt;
    const absX = Math.abs(deltaX);
    const absY = Math.abs(deltaY);

    const isHorizontalSwipe = absX >= swipeMinDistance && absX > absY * 1.2 && elapsed <= swipeMaxDurationMs;
    if (!isHorizontalSwipe) return;

    if (deltaX < 0) {
      if (nextGalleryHref) navigateToGallery(nextGalleryHref, 'next');
      return;
    }

    if (prevGalleryHref) navigateToGallery(prevGalleryHref, 'prev');
  };

  $effect(() => {
    if (typeof window === 'undefined') return;
    currentImage.id;
    revealControls();
    return () => {
      if (hideTimer) clearTimeout(hideTimer);
    };
  });
</script>

<svelte:window onmousemove={onPointerMove} onkeydown={onKeydown} ontouchstart={onTouchStart} ontouchend={onTouchEnd} />

<section class="relative h-[calc(100dvh-var(--site-header-height,54px))] w-full overflow-hidden bg-canvas text-canvas-text">
  <img
    src={photoPublicUrl(currentImage.delivery_storage_path, 2400)}
    alt={currentImage.alt_text ?? title}
    class="h-full w-full object-contain"
    loading="eager"
  />

  {#if controlsVisible}
    <a
      href="/gallery"
      onclick={onCloseClick}
      class="chrome-panel absolute left-4 top-4 rounded px-3 py-2 text-xs uppercase tracking-[0.15em]"
      style="view-transition-name: photo-close;"
    >
      Close
    </a>

    {#if canCycleGallery}
      <a
        href={prevGalleryHref ?? '#'}
        onclick={() => prepareDetailTransition('prev')}
        class="chrome-panel absolute left-0 top-1/2 -translate-y-1/2 px-4 py-5 text-lg"
        aria-label="Previous image"
      >
        ←
      </a>

      <a
        href={nextGalleryHref ?? '#'}
        onclick={() => prepareDetailTransition('next')}
        class="chrome-panel absolute right-0 top-1/2 -translate-y-1/2 px-4 py-5 text-lg"
        aria-label="Next image"
      >
        →
      </a>
    {/if}
  {/if}

  <aside class="chrome-panel absolute inset-x-0 bottom-0" style="view-transition-name: photo-drawer;">
    <button class="w-full border-b border-border px-4 py-2 text-left text-xs uppercase tracking-[0.16em]" onclick={() => (metaMinimized = !metaMinimized)}>
      {#if metaMinimized}
        {title} - Expand
      {:else}
        Minimize
      {/if}
    </button>

    {#if !metaMinimized}
      <div class="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
        <div>
          <h1 class="text-sm uppercase tracking-[0.16em]">{title}</h1>
          {#if description}
            <p class="mt-2 max-w-[70ch] text-sm text-canvas-text/80">{description}</p>
          {/if}
        </div>
      </div>
    {/if}

    {#if additionalImages.length > 0}
      <div class="flex gap-2 overflow-x-auto px-4 pb-3" data-swipe-ignore>
        {#each additionalImages as img (img.id)}
          <a
            href={`/photo/${photoSlug}/${img.id}`}
            onclick={() => prepareDetailTransition()}
            class="block shrink-0 overflow-hidden rounded border border-border-strong"
          >
            <img src={photoPublicUrl(img.delivery_storage_path, 180)} alt={img.alt_text ?? title} class="h-14 w-20 object-cover" loading="lazy" />
          </a>
        {/each}
      </div>
    {/if}
  </aside>
</section>
