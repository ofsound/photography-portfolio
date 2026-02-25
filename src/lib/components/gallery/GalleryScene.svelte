<script lang="ts">
  import { goto } from '$app/navigation';
  import { fade } from 'svelte/transition';
  import { onDestroy, onMount } from 'svelte';
  import { galleryTransitionPhase } from '$lib/stores/gallery-transition';

  /** Portals the element to document.body so it can stack above the promoted tile (z-70). */
  const portal = (node: HTMLElement) => {
    document.body.appendChild(node);
    return {
      destroy() {
        node.remove();
      }
    };
  };
  import type { GalleryPhoto } from '$lib/types/content';
  import { GALLERY_DETAIL_SHARED_WIDTH, photoPublicUrl } from '$lib/utils/storage-url';
  import {
    computeContainRect,
    demoteTile,
    movePromotedTile,
    promoteTile,
    releasePromotedTile,
    reinsertPromotedTile,
    type TileAnimationSession
  } from './tile-animator';

  type ActiveRoute = {
    photoSlug: string;
    imageId: string | null;
    prevGalleryHref: string | null;
    nextGalleryHref: string | null;
  };

  type ViewerData = {
    photos: GalleryPhoto[];
    hasMore: boolean;
    page: number;
    pageSize: number;
    density: number;
    q: string;
    layoutMode: 'uniform' | 'masonry';
    widthMode: 'full' | 'constrained';
    maxContentWidthPx: number | null;
    uniformThumbRatio: number;
    maxDensity: number;
    baseQueryString: string;
    active: ActiveRoute | null;
  };

  type GalleryImage = NonNullable<GalleryPhoto['leadImage']>;

  let { data } = $props<{ data: ViewerData }>();
  const readInitialData = () => data;

  let density = $state(readInitialData().density);
  let layoutMode = $state<'uniform' | 'masonry'>(readInitialData().layoutMode);
  let widthMode = $state<'full' | 'constrained'>(readInitialData().widthMode);
  let query = $state(readInitialData().q);
  let pageSize = $state(readInitialData().pageSize);
  let photos = $state<GalleryPhoto[]>(readInitialData().photos);
  let currentPage = $state(readInitialData().page);
  let hasMore = $state(readInitialData().hasMore);
  let loadError = $state<string | null>(null);
  let isLoadingMore = $state(false);
  let loadSentinel = $state<HTMLElement | null>(null);
  let observer: IntersectionObserver | null = null;

  let activeSlug = $state<string | null>(null);
  let activeImageId = $state<string | null>(null);
  let prevGalleryHref = $state<string | null>(null);
  let nextGalleryHref = $state<string | null>(null);
  let controlsVisible = $state(true);
  let promoted = $state<TileAnimationSession | null>(null);
  let routeKey = $state('');
  let querySignature = $state('');
  let mounted = $state(false);
  let hasHydratedRoute = false;
  let skipNextRouteAnimation = false;

  let hideTimer: ReturnType<typeof setTimeout> | undefined;
  let touchStartX = $state(0);
  let touchStartY = $state(0);
  let touchStartedAt = $state(0);
  let touchActive = $state(false);
  const swipeMinDistance = 48;
  const swipeMaxDurationMs = 700;

  const FADE_OUT_CHROME_MS = 280;
  const SCALE_MASK_MS = 520;
  const CLOSING_CHROME_MS = 180;

  let transitionQueue = Promise.resolve();
  let transitionsInFlight = $state(0);

  const tileRefs = new Map<string, HTMLElement>();

  const queueTransition = (work: () => Promise<void>) => {
    transitionQueue = transitionQueue
      .then(async () => {
        transitionsInFlight += 1;
        try {
          await work();
        } finally {
          transitionsInFlight = Math.max(0, transitionsInFlight - 1);
        }
      })
      .catch((error) => {
        transitionsInFlight = 0;
        console.error('gallery-transition-failed', error);
      });
    return transitionQueue;
  };

  const isTransitioning = $derived(transitionsInFlight > 0);

  let transitionPhase = $state<import('$lib/stores/gallery-transition').GalleryTransitionPhase>('idle');
  $effect(() => {
    const unsub = galleryTransitionPhase.subscribe((p) => {
      transitionPhase = p;
    });
    return unsub;
  });
  const chromePanelHidden = $derived(
    transitionPhase === 'fade-out-chrome' ||
      transitionPhase === 'scale-and-mask' ||
      transitionPhase === 'open' ||
      transitionPhase === 'closing-chrome' ||
      transitionPhase === 'closing-scale'
  );
  const overlayChromeHidden = $derived(
    transitionPhase === 'closing-chrome' || transitionPhase === 'closing-scale'
  );

  const registerTile = (node: HTMLElement, slug: string) => {
    tileRefs.set(slug, node);
    let currentSlug = slug;

    return {
      update(nextSlug: string) {
        if (nextSlug === currentSlug) return;
        if (tileRefs.get(currentSlug) === node) {
          tileRefs.delete(currentSlug);
        }
        currentSlug = nextSlug;
        tileRefs.set(currentSlug, node);
      },
      destroy() {
        if (tileRefs.get(currentSlug) === node) {
          tileRefs.delete(currentSlug);
        }
      }
    };
  };

  const reducedMotion = () => (typeof window !== 'undefined' ? window.matchMedia('(prefers-reduced-motion: reduce)').matches : false);

  const readHeaderHeight = () => {
    if (typeof window === 'undefined') return 54;
    const raw = getComputedStyle(document.documentElement).getPropertyValue('--site-header-height').trim();
    const parsed = Number.parseFloat(raw);
    return Number.isFinite(parsed) ? parsed : 54;
  };

  const buildBaseParams = () => {
    const params = new URLSearchParams();
    params.set('density', String(density));
    params.set('layout', layoutMode);
    params.set('width', widthMode);
    params.set('pageSize', String(pageSize));
    if (query.trim()) {
      params.set('q', query.trim());
    }
    return params;
  };

  const withCurrentSearch = (href: string) => {
    const base = buildBaseParams().toString();
    return base ? `${href}?${base}` : href;
  };

  const navigateGalleryWithParams = (mutate: (params: URLSearchParams) => void) => {
    const params = buildBaseParams();
    mutate(params);

    const nextDensity = Number.parseInt(params.get('density') ?? String(density), 10);
    density = Number.isFinite(nextDensity) ? nextDensity : density;
    const nextLayout = params.get('layout');
    layoutMode = nextLayout === 'masonry' ? 'masonry' : 'uniform';
    const nextWidth = params.get('width');
    widthMode = nextWidth === 'constrained' ? 'constrained' : 'full';
    query = params.get('q')?.trim() ?? '';
    const nextPageSize = Number.parseInt(params.get('pageSize') ?? String(pageSize), 10);
    pageSize = Number.isFinite(nextPageSize) ? nextPageSize : pageSize;

    goto(`/gallery?${params.toString()}`, { replaceState: true, noScroll: true, keepFocus: true });
  };

  const colCount = $derived(Math.max(1, Math.min(data.maxDensity ?? 20, Number(density) || 6)));
  const placeholderCount = $derived(Math.max(colCount, 6));
  const uniformRatio = $derived(Math.max(0.2, Number(data.uniformThumbRatio ?? 1)));
  const constrainedMax = $derived(data.maxContentWidthPx ?? 1600);
  const sectionMaxWidthStyle = $derived(widthMode === 'constrained' ? `max-width: min(100%, ${constrainedMax}px);` : 'max-width: 100%;');
  const canCycleGallery = $derived(Boolean(prevGalleryHref && nextGalleryHref));

  const activePhoto = $derived(activeSlug ? photos.find((photo) => photo.slug === activeSlug) ?? null : null);
  const currentImage = $derived.by<GalleryImage | null>(() => {
    if (!activePhoto || !activePhoto.leadImage) return null;
    if (!activeImageId) return activePhoto.leadImage;
    return activePhoto.additionalImages.find((image) => image.id === activeImageId) ?? activePhoto.leadImage;
  });

  const scheduleControlsHide = () => {
    if (hideTimer) {
      clearTimeout(hideTimer);
      hideTimer = undefined;
    }
  };

  const revealControls = () => {
    controlsVisible = true;
  };

  const findPhoto = (slug: string | null | undefined) => {
    if (!slug) return null;
    return photos.find((photo) => photo.slug === slug) ?? null;
  };

  const offsetRect = (rect: { top: number; left: number; width: number; height: number }, deltaX: number) => ({
    top: rect.top,
    left: rect.left + deltaX,
    width: rect.width,
    height: rect.height
  });

  const imageFor = (photo: GalleryPhoto, imageId: string | null): GalleryImage | null => {
    if (!photo.leadImage) return null;
    if (!imageId) return photo.leadImage;
    return photo.additionalImages.find((image) => image.id === imageId) ?? photo.leadImage;
  };

  const parseSlugFromPhotoHref = (href: string | null) => {
    if (!href) return null;
    const match = href.match(/^\/photo\/([^/]+)/);
    if (!match) return null;
    return decodeURIComponent(match[1]);
  };

  const localNeighborsFor = (slug: string) => {
    if (photos.length <= 1) {
      return { prevGalleryHref: null, nextGalleryHref: null };
    }

    const index = photos.findIndex((photo) => photo.slug === slug);
    if (index === -1) {
      return { prevGalleryHref: null, nextGalleryHref: null };
    }

    const prev = photos[(index - 1 + photos.length) % photos.length];
    const next = photos[(index + 1) % photos.length];
    return {
      prevGalleryHref: prev?.slug ? `/photo/${prev.slug}` : null,
      nextGalleryHref: next?.slug ? `/photo/${next.slug}` : null
    };
  };

  const targetRectFor = (photo: GalleryPhoto, imageId: string | null) => {
    const image = imageFor(photo, imageId);
    const baseWidth = image?.width_px ?? Math.max(1, promoted?.currentRect.width ?? 1);
    const baseHeight = image?.height_px ?? Math.max(1, promoted?.currentRect.height ?? 1);

    return computeContainRect(window.innerWidth, window.innerHeight, baseWidth, baseHeight, readHeaderHeight(), 0, 10, 10);
  };

  const ensurePromotedTile = async (
    slug: string,
    imageId: string | null,
    animate: boolean,
    durationMsOverride?: number
  ) => {
    const photo = findPhoto(slug);
    if (!photo) return;

    const node = tileRefs.get(slug);
    if (!node) {
      activeSlug = slug;
      activeImageId = imageId;
      return;
    }

    const nextRect = targetRectFor(photo, imageId);
    const duration = durationMsOverride ?? (animate ? 520 : 0);
    const baseMotion = {
      reducedMotion: reducedMotion(),
      durationMs: duration,
      easing: 'cubic-bezier(0.16, 1, 0.3, 1)'
    };

    if (promoted && promoted.slug !== slug) {
      releasePromotedTile(promoted);
      promoted = null;
    }

    if (!promoted) {
      promoted = await promoteTile({ slug, node, targetRect: nextRect, ...baseMotion });
    } else {
      await movePromotedTile(promoted, nextRect, baseMotion);
    }

    activeSlug = slug;
    activeImageId = imageId;
    revealControls();
  };

  const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

  const collapsePromotedTile = async (animate: boolean) => {
    if (!promoted) return;

    const session = promoted;

    const placeholderRect = session.placeholder.getBoundingClientRect();
    const outOfView = placeholderRect.bottom < 0 || placeholderRect.top > window.innerHeight;
    if (outOfView) {
      session.placeholder.scrollIntoView({ behavior: reducedMotion() ? 'auto' : 'smooth', block: 'center' });
      if (!reducedMotion()) {
        await wait(260);
      }
    }

    if (!reducedMotion()) {
      galleryTransitionPhase.set('closing-chrome');
      await wait(CLOSING_CHROME_MS);
    }

    galleryTransitionPhase.set('closing-scale');
    activeSlug = null;
    activeImageId = null;

    await demoteTile(session, {
      reducedMotion: reducedMotion(),
      durationMs: animate ? 460 : 0,
      easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)'
    });

    await wait(reducedMotion() ? 150 : SCALE_MASK_MS);

    reinsertPromotedTile(session);
    promoted = null;
    galleryTransitionPhase.set('idle');
  };

  const applyRouteState = async (route: ActiveRoute | null, animate: boolean) => {
    if (!route) {
      await collapsePromotedTile(animate);
      prevGalleryHref = null;
      nextGalleryHref = null;
      return;
    }

    galleryTransitionPhase.set('open');
    const switchingPhotos = Boolean(activeSlug && activeSlug !== route.photoSlug);
    await ensurePromotedTile(route.photoSlug, route.imageId, animate && !switchingPhotos);

    activeSlug = route.photoSlug;
    activeImageId = route.imageId;
    prevGalleryHref = route.prevGalleryHref;
    nextGalleryHref = route.nextGalleryHref;
  };

  const updateDensity = (next: number) => {
    navigateGalleryWithParams((params) => {
      params.set('density', String(next));
    });
  };

  const updateLayoutMode = (next: 'uniform' | 'masonry') => {
    navigateGalleryWithParams((params) => {
      params.set('layout', next);
    });
  };

  const updateWidthMode = (next: 'full' | 'constrained') => {
    navigateGalleryWithParams((params) => {
      params.set('width', next);
    });
  };

  const onSearchSubmit = (event: SubmitEvent) => {
    event.preventDefault();
    navigateGalleryWithParams((params) => {
      if (!query.trim()) {
        params.delete('q');
        return;
      }
      params.set('q', query.trim());
    });
  };

  const onOpenPhoto = (event: MouseEvent, slug: string) => {
    event.preventDefault();

    void (async () => {
      await queueTransition(async () => {
        const photo = findPhoto(slug);
        if (!photo) return;

        const localNeighbors = localNeighborsFor(slug);
        prevGalleryHref = localNeighbors.prevGalleryHref;
        nextGalleryHref = localNeighbors.nextGalleryHref;

        if (reducedMotion()) {
          activeSlug = slug;
          activeImageId = null;
          await ensurePromotedTile(slug, null, true);
          galleryTransitionPhase.set('open');
          return;
        }

        galleryTransitionPhase.set('fade-out-chrome');
        await wait(FADE_OUT_CHROME_MS);

        galleryTransitionPhase.set('scale-and-mask');
        activeSlug = slug;
        activeImageId = null;

        await ensurePromotedTile(slug, null, true, SCALE_MASK_MS);

        galleryTransitionPhase.set('open');
      });

      skipNextRouteAnimation = true;
      await goto(withCurrentSearch(`/photo/${slug}`), { noScroll: true, keepFocus: true });
    })();
  };

  const closeToGallery = (event?: MouseEvent | KeyboardEvent) => {
    event?.preventDefault();

    void (async () => {
      await queueTransition(async () => {
        await collapsePromotedTile(true);
      });

      skipNextRouteAnimation = true;
      await goto(`/gallery?${buildBaseParams().toString()}`, { noScroll: true, keepFocus: true });
    })();
  };

  const slideToNeighbor = async (targetSlug: string, direction: 'prev' | 'next') => {
    const targetPhoto = findPhoto(targetSlug);
    if (!targetPhoto) return false;

    const targetNode = tileRefs.get(targetSlug);
    if (!targetNode || !promoted || promoted.slug === targetSlug) {
      await ensurePromotedTile(targetSlug, null, false);
      return true;
    }

    const incomingFinalRect = targetRectFor(targetPhoto, null);
    const travel = Math.max(window.innerWidth, incomingFinalRect.width + 72);
    const isNext = direction === 'next';
    const incomingStartRect = offsetRect(incomingFinalRect, isNext ? travel : -travel);
    const outgoingEndRect = offsetRect(promoted.currentRect, isNext ? -travel : travel);

    const outgoingSession = promoted;
    const incomingSession = await promoteTile({
      slug: targetSlug,
      node: targetNode,
      targetRect: incomingStartRect,
      reducedMotion: true,
      durationMs: 0
    });

    const motion = {
      reducedMotion: reducedMotion(),
      durationMs: 360,
      easing: 'cubic-bezier(0.22, 1, 0.36, 1)'
    };

    await Promise.all([
      movePromotedTile(outgoingSession, outgoingEndRect, motion),
      movePromotedTile(incomingSession, incomingFinalRect, motion)
    ]);

    releasePromotedTile(outgoingSession);
    promoted = incomingSession;
    activeSlug = targetSlug;
    activeImageId = null;
    return true;
  };

  const onNeighborNavigate = (event: MouseEvent, href: string | null, direction: 'prev' | 'next') => {
    event.preventDefault();
    if (!href) return;

    const targetSlug = parseSlugFromPhotoHref(href);

    void (async () => {
      await queueTransition(async () => {
        if (targetSlug) {
          const localNeighbors = localNeighborsFor(targetSlug);
          prevGalleryHref = localNeighbors.prevGalleryHref;
          nextGalleryHref = localNeighbors.nextGalleryHref;
          await slideToNeighbor(targetSlug, direction);
        }
      });

      skipNextRouteAnimation = true;
      await goto(withCurrentSearch(href), { noScroll: true, keepFocus: true });
    })();
  };

  const onSelectAdditionalImage = (event: MouseEvent, imageId: string) => {
    event.preventDefault();
    if (!activeSlug) return;

    void (async () => {
      await queueTransition(async () => {
        activeImageId = imageId;
        const photo = findPhoto(activeSlug);
        if (photo && promoted) {
          const nextRect = targetRectFor(photo, imageId);
          await movePromotedTile(promoted, nextRect, {
            reducedMotion: reducedMotion(),
            durationMs: 260,
            easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)'
          });
        }
      });

      skipNextRouteAnimation = true;
      await goto(withCurrentSearch(`/photo/${activeSlug}/${imageId}`), { noScroll: true, keepFocus: true });
    })();
  };

  const onPointerMove = () => {
    if (!activeSlug) return;
    revealControls();
  };

  const onKeydown = (event: KeyboardEvent) => {
    if (!activeSlug) return;
    if (isTransitioning) return;

    if (event.key === 'Escape') {
      closeToGallery(event);
      return;
    }

    if (event.key === 'ArrowLeft' && prevGalleryHref) {
      onNeighborNavigate(event as unknown as MouseEvent, prevGalleryHref, 'prev');
      return;
    }

    if (event.key === 'ArrowRight' && nextGalleryHref) {
      onNeighborNavigate(event as unknown as MouseEvent, nextGalleryHref, 'next');
    }
  };

  const shouldIgnoreSwipe = (target: EventTarget | null) => target instanceof HTMLElement && !!target.closest('[data-swipe-ignore]');

  const onTouchStart = (event: TouchEvent) => {
    if (!activeSlug || shouldIgnoreSwipe(event.target) || event.touches.length !== 1) {
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
    if (!touchActive || !canCycleGallery) return;
    if (isTransitioning) return;
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

    if (deltaX < 0 && nextGalleryHref) {
      void onNeighborNavigate(new MouseEvent('click'), nextGalleryHref, 'next');
      return;
    }

    if (prevGalleryHref) {
      void onNeighborNavigate(new MouseEvent('click'), prevGalleryHref, 'prev');
    }
  };

  const onResize = () => {
    if (!activeSlug || !promoted) return;

    void queueTransition(async () => {
      const photo = findPhoto(activeSlug);
      if (!photo || !promoted) return;
      const nextRect = targetRectFor(photo, activeImageId);
      await movePromotedTile(promoted, nextRect, {
        reducedMotion: true,
        durationMs: 0
      });
    });
  };

  const loadNextPage = async () => {
    if (isLoadingMore || !hasMore || activeSlug) return;

    isLoadingMore = true;
    loadError = null;

    try {
      const params = buildBaseParams();
      params.set('page', String(currentPage + 1));

      const response = await fetch(`/gallery/feed?${params.toString()}`);
      if (!response.ok) {
        throw new Error('request-failed');
      }

      const payload = (await response.json()) as {
        photos: GalleryPhoto[];
        hasMore: boolean;
        page: number;
      };

      const existing = new Set(photos.map((photo) => photo.id));
      const nextPhotos = payload.photos.filter((photo) => !existing.has(photo.id));
      photos = [...photos, ...nextPhotos];
      currentPage = payload.page;
      hasMore = payload.hasMore;
    } catch {
      loadError = 'Could not load more photos.';
    } finally {
      isLoadingMore = false;
    }
  };

  const teardownObserver = () => {
    if (!observer) return;
    observer.disconnect();
    observer = null;
  };

  const tileAspectRatio = (photo: GalleryPhoto) => {
    const width = photo.leadImage?.width_px;
    const height = photo.leadImage?.height_px;
    if (!width || !height) return uniformRatio;
    return Math.max(0.2, width / height);
  };

  onMount(() => {
    mounted = true;
  });

  $effect(() => {
    if (!mounted) return;

    const nextQuerySignature = [data.q, data.density, data.layoutMode, data.widthMode, data.pageSize].join('|');
    if (nextQuerySignature !== querySignature) {
      querySignature = nextQuerySignature;
      density = data.density;
      layoutMode = data.layoutMode;
      widthMode = data.widthMode;
      query = data.q;
      pageSize = data.pageSize;
      photos = data.photos;
      currentPage = data.page;
      hasMore = data.hasMore;
      loadError = null;
    } else {
      const existing = new Set(photos.map((photo) => photo.id));
      const nextPhotos = data.photos.filter((photo: GalleryPhoto) => !existing.has(photo.id));
      if (nextPhotos.length > 0) {
        photos = [...photos, ...nextPhotos];
      }

      if (data.page > currentPage) {
        currentPage = data.page;
      }

      if (hasMore !== data.hasMore) {
        hasMore = data.hasMore;
      }
    }

    const nextRouteKey = data.active ? `${data.active.photoSlug}:${data.active.imageId ?? ''}` : '';
    if (nextRouteKey === routeKey) return;

    const animate = hasHydratedRoute && !skipNextRouteAnimation;
    skipNextRouteAnimation = false;
    routeKey = nextRouteKey;
    hasHydratedRoute = true;

    void queueTransition(async () => {
      await applyRouteState(data.active, animate);
    });
  });

  $effect(() => {
    teardownObserver();
    if (!loadSentinel || !hasMore || Boolean(activeSlug)) return;

    observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (!entry?.isIntersecting) return;
        void loadNextPage();
      },
      { rootMargin: '600px 0px' }
    );

    observer.observe(loadSentinel);
    return teardownObserver;
  });

  onDestroy(() => {
    teardownObserver();
    if (hideTimer) clearTimeout(hideTimer);
    if (promoted) {
      releasePromotedTile(promoted);
      promoted = null;
    }
  });
</script>

<svelte:window onresize={onResize} onmousemove={onPointerMove} onkeydown={onKeydown} ontouchstart={onTouchStart} ontouchend={onTouchEnd} />

<section class="mx-auto w-full px-4 py-5" style={sectionMaxWidthStyle}>
  <div
    class="chrome-panel sticky top-[70px] z-30 mb-5 grid gap-2 rounded px-3 py-2 text-xs uppercase tracking-[0.15em] transition-opacity duration-[280ms] ease-out lg:grid-cols-[1fr_auto] lg:items-center"
    class:opacity-0={chromePanelHidden}
  >
    <form class="flex flex-1 items-center gap-2" onsubmit={onSearchSubmit}>
      <input
        name="q"
        bind:value={query}
        placeholder="Search title, description, tags, category"
        class="w-full rounded border border-border bg-transparent px-2 py-1"
      />
      <button class="rounded border border-border-strong px-2 py-1" type="submit">Search</button>
    </form>

    <div class="flex flex-wrap items-center justify-end gap-3">
      <label class="flex items-center gap-2">
        Density
        <input
          type="range"
          min="1"
          max={String(data.maxDensity ?? 20)}
          value={colCount}
          oninput={(e) => updateDensity(Number((e.currentTarget as HTMLInputElement).value))}
        />
        <span class="tabular-nums">{colCount}</span>
      </label>

      <div class="flex items-center gap-1">
        <button
          type="button"
          class="rounded border border-border-strong px-2 py-1 disabled:opacity-40"
          onclick={() => updateLayoutMode('uniform')}
          disabled={layoutMode === 'uniform'}
        >
          Uniform
        </button>
        <button
          type="button"
          class="rounded border border-border-strong px-2 py-1 disabled:opacity-40"
          onclick={() => updateLayoutMode('masonry')}
          disabled={layoutMode === 'masonry'}
        >
          Masonry
        </button>
      </div>

      <div class="flex items-center gap-1">
        <button
          type="button"
          class="rounded border border-border-strong px-2 py-1 disabled:opacity-40"
          onclick={() => updateWidthMode('full')}
          disabled={widthMode === 'full'}
        >
          Full
        </button>
        <button
          type="button"
          class="rounded border border-border-strong px-2 py-1 disabled:opacity-40"
          onclick={() => updateWidthMode('constrained')}
          disabled={widthMode === 'constrained'}
        >
          Constrained
        </button>
      </div>
    </div>
  </div>

  {#if photos.length === 0}
    <p class="py-16 text-center text-sm uppercase tracking-[0.14em] text-text-muted">No photos found.</p>
  {:else}
    {#if layoutMode === 'uniform'}
      <ul class="grid gap-2" style={`grid-template-columns: repeat(${colCount}, minmax(0, 1fr));`}>
        {#each photos as photo (photo.id)}
          <li>
            <a
              href={withCurrentSearch(`/photo/${photo.slug}`)}
              use:registerTile={photo.slug}
              class="group block overflow-hidden rounded"
              style={`aspect-ratio: ${uniformRatio};`}
              onclick={(event) => onOpenPhoto(event, photo.slug)}
            >
              {#if photo.leadImage}
                <img
                  src={photoPublicUrl(photo.leadImage.delivery_storage_path, GALLERY_DETAIL_SHARED_WIDTH)}
                  alt={photo.leadImage.alt_text ?? photo.title}
                  class="h-full w-full object-cover transition-transform duration-500 ease-cinematic group-hover:scale-[1.03]"
                  loading="lazy"
                />
              {/if}
            </a>
          </li>
        {/each}

        {#if isLoadingMore}
          {#each Array.from({ length: placeholderCount }) as _, index (index)}
            <li class="animate-pulse rounded bg-surface-muted" style={`aspect-ratio: ${uniformRatio};`}></li>
          {/each}
        {/if}
      </ul>
    {:else}
      <ul class="columns-2 gap-2 md:columns-4 lg:columns-6" style={`columns: ${colCount};`}>
        {#each photos as photo (photo.id)}
          <li class="mb-2 break-inside-avoid">
            <a
              href={withCurrentSearch(`/photo/${photo.slug}`)}
              use:registerTile={photo.slug}
              class="group block overflow-hidden rounded"
              style={`aspect-ratio: ${tileAspectRatio(photo)};`}
              onclick={(event) => onOpenPhoto(event, photo.slug)}
            >
              {#if photo.leadImage}
                <img
                  src={photoPublicUrl(photo.leadImage.delivery_storage_path, GALLERY_DETAIL_SHARED_WIDTH)}
                  alt={photo.leadImage.alt_text ?? photo.title}
                  class="h-full w-full object-cover transition-transform duration-500 ease-cinematic group-hover:scale-[1.02]"
                  loading="lazy"
                />
              {/if}
            </a>
          </li>
        {/each}

        {#if isLoadingMore}
          {#each Array.from({ length: placeholderCount }) as _, index (index)}
            <li class="mb-2 break-inside-avoid animate-pulse rounded bg-surface-muted" style={`height: ${120 + (index % 5) * 34}px;`}></li>
          {/each}
        {/if}
      </ul>
    {/if}

    {#if hasMore}
      <div bind:this={loadSentinel} class="h-10 w-full"></div>
    {/if}

    {#if isLoadingMore}
      <p class="py-4 text-center text-xs uppercase tracking-[0.14em] text-text-subtle">Loading more</p>
    {/if}

    {#if loadError}
      <div class="py-4 text-center text-sm">
        <p>{loadError}</p>
        <button class="mt-2 rounded border border-border-strong px-3 py-1 text-xs uppercase tracking-[0.14em]" type="button" onclick={() => void loadNextPage()}>
          Retry
        </button>
      </div>
    {/if}
  {/if}
</section>

{#if activePhoto && currentImage}
  <div use:portal transition:fade={{ duration: SCALE_MASK_MS }} class="fixed inset-0 z-[60] bg-black"></div>

  {#if controlsVisible}
    <div
      use:portal
      class="fixed inset-0 z-[80] pointer-events-none transition-opacity ease-out"
      class:opacity-0={overlayChromeHidden}
      style="transition-duration: {CLOSING_CHROME_MS}ms"
      aria-hidden="true"
    >
      <a
        href={withCurrentSearch('/gallery')}
        onclick={closeToGallery}
        class="chrome-panel pointer-events-auto fixed left-4 top-[calc(var(--site-header-height,54px)+14px)] rounded px-3 py-2 text-xs uppercase tracking-[0.15em]"
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
        class:pointer-events-none={isTransitioning}
        class:opacity-50={isTransitioning}
        aria-disabled={isTransitioning}
        aria-label="Previous image"
      >
        ←
      </a>

      <a
        href={nextGalleryHref ? withCurrentSearch(nextGalleryHref) : '#'}
        onclick={(event) => onNeighborNavigate(event, nextGalleryHref, 'next')}
        class="chrome-panel pointer-events-auto fixed right-0 top-1/2 -translate-y-1/2 px-4 py-5 text-lg"
        class:pointer-events-none={isTransitioning}
        class:opacity-50={isTransitioning}
        aria-disabled={isTransitioning}
        aria-label="Next image"
      >
        →
      </a>
    {/if}
    </div>
  {/if}

  <aside
    use:portal
    class="chrome-panel fixed left-[5%] bottom-[5%] z-[80] w-fit max-w-[min(90vw,70ch)] rounded px-4 py-3 transition-opacity ease-out"
    class:opacity-0={overlayChromeHidden}
    style="transition-duration: {CLOSING_CHROME_MS}ms"
  >
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h1 class="text-sm uppercase tracking-[0.16em]">{activePhoto.title}</h1>
        {#if activePhoto.description}
          <p class="mt-2 max-w-[70ch] text-sm text-canvas-text/80">{activePhoto.description}</p>
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
{/if}
