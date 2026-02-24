<script lang="ts">
  import { photoPublicUrl } from '$lib/utils/storage-url';
  import { goto } from '$app/navigation';
  import { onDestroy, onMount } from 'svelte';
  import { readGalleryReturnState, storeViewTransitionHint, transitionNameForImage } from '$lib/utils/view-transition';

  type Image = {
    id: string;
    kind: 'lead' | 'additional';
    position: number;
    delivery_storage_path: string;
    alt_text: string | null;
  };

  let { photoSlug, title, description, currentImage, leadImage, additionalImages } = $props<{
    photoSlug: string;
    title: string;
    description: string | null;
    currentImage: Image;
    leadImage: Image;
    additionalImages: Image[];
  }>();

  let controlsVisible = $state(true);
  let metaMinimized = $state(false);
  let hideTimer: ReturnType<typeof setTimeout> | undefined;
  let touchStartX = $state(0);
  let touchStartY = $state(0);
  let touchStartedAt = $state(0);
  let touchActive = $state(false);

  const orderedImages = $derived([leadImage, ...additionalImages].sort((a, b) => a.position - b.position));
  const currentIndex = $derived(Math.max(0, orderedImages.findIndex((img) => img.id === currentImage.id)));
  const swipeMinDistance = 48;
  const swipeMaxDurationMs = 700;
  const currentTransitionName = $derived(transitionNameForImage(currentImage.id));

  const routeForImage = (image: Image) => {
    if (image.kind === 'lead') {
      return `/photo/${photoSlug}`;
    }
    return `/photo/${photoSlug}/${image.id}`;
  };

  const prevImage = $derived(orderedImages[(currentIndex - 1 + orderedImages.length) % orderedImages.length]);
  const nextImage = $derived(orderedImages[(currentIndex + 1) % orderedImages.length]);

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

  const navigateToImage = (image: Image, direction?: 'next' | 'prev') => {
    storeViewTransitionHint({
      kind: 'detail-to-detail',
      direction
    });
    goto(routeForImage(image), { noScroll: true, keepFocus: true });
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
      event.preventDefault();
      navigateToImage(prevImage, 'prev');
    }
    if (event.key === 'ArrowRight') {
      event.preventDefault();
      navigateToImage(nextImage, 'next');
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
      navigateToImage(nextImage, 'next');
      return;
    }

    navigateToImage(prevImage, 'prev');
  };

  onMount(() => {
    revealControls();
  });

  onDestroy(() => {
    if (hideTimer) clearTimeout(hideTimer);
  });
</script>

<svelte:window onmousemove={onPointerMove} onkeydown={onKeydown} ontouchstart={onTouchStart} ontouchend={onTouchEnd} />

<section class="relative h-[100dvh] w-full overflow-hidden bg-black text-white">
  <img
    src={photoPublicUrl(currentImage.delivery_storage_path, 2400)}
    alt={currentImage.alt_text ?? title}
    class="h-full w-full object-contain"
    style={currentTransitionName ? `view-transition-name: ${currentTransitionName};` : undefined}
    loading="eager"
  />

  {#if controlsVisible}
    <a href="/gallery" onclick={onCloseClick} class="chrome-panel absolute left-4 top-4 rounded px-3 py-2 text-xs uppercase tracking-[0.15em]">
      Close
    </a>

    <a
      href={routeForImage(prevImage)}
      onclick={() => prepareDetailTransition('prev')}
      class="chrome-panel absolute left-0 top-1/2 -translate-y-1/2 px-4 py-5 text-lg"
      aria-label="Previous image"
    >
      ←
    </a>

    <a
      href={routeForImage(nextImage)}
      onclick={() => prepareDetailTransition('next')}
      class="chrome-panel absolute right-0 top-1/2 -translate-y-1/2 px-4 py-5 text-lg"
      aria-label="Next image"
    >
      →
    </a>
  {/if}

  <aside class="chrome-panel absolute inset-x-0 bottom-0">
    <button class="w-full border-b border-white/15 px-4 py-2 text-left text-xs uppercase tracking-[0.16em]" onclick={() => (metaMinimized = !metaMinimized)}>
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
            <p class="mt-2 max-w-[70ch] text-sm text-white/80">{description}</p>
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
            class="block shrink-0 overflow-hidden rounded border border-white/20"
          >
            <img src={photoPublicUrl(img.delivery_storage_path, 180)} alt={img.alt_text ?? title} class="h-14 w-20 object-cover" loading="lazy" />
          </a>
        {/each}
      </div>
    {/if}
  </aside>
</section>
