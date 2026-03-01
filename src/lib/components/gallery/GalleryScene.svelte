<script lang="ts">
  import {goto} from "$app/navigation";
  import {onDestroy, onMount} from "svelte";
  import {getGalleryTransitionContext} from "$lib/context/gallery-transition";
  import {getGalleryPrefs, galleryDensityStore} from "$lib/stores/gallery-prefs";
  import GalleryDetailOverlay from "./scene/GalleryDetailOverlay.svelte";
  import GalleryPreloader from "./scene/GalleryPreloader.svelte";
  import GalleryTiles from "./scene/GalleryTiles.svelte";

  /** Portals the element to document.body so it can stack above the promoted tile (z-70). */
  const portal = (node: HTMLElement) => {
    if (typeof document !== "undefined" && document.body) {
      document.body.appendChild(node);
    }
    return {
      destroy() {
        node.remove();
      },
    };
  };
  import type {GalleryPhoto} from "$lib/types/content";
  import {parseDimensions} from "$lib/utils/parse-dimensions";
  import {thumbCropTransform} from "$lib/utils/thumb-crop";
  import {GALLERY_DETAIL_SHARED_WIDTH, photoPublicUrl} from "$lib/utils/storage-url";
  import {computeContainRect, cropToImgTransform, demoteTile, movePromotedTile, promoteTile, releasePromotedTile, reinsertPromotedTile, type TileAnimationSession} from "./tile-animator";

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
    gap: number;
    q: string;
    layoutMode: "uniform" | "masonry";
    widthMode: "full" | "constrained";
    maxContentWidthPx: number | null;
    uniformThumbRatio: number;
    maxDensity: number;
    baseQueryString: string;
    active: ActiveRoute | null;
  };

  type GalleryImage = NonNullable<GalleryPhoto["leadImage"]>;

  let {data} = $props<{data: ViewerData}>();
  const readInitialData = () => data;

  let gap = $state(readInitialData().gap);
  let layoutMode = $state<"uniform" | "masonry">(readInitialData().layoutMode);
  let widthMode = $state<"full" | "constrained">(readInitialData().widthMode);
  let query = $state(readInitialData().q);
  let pageSize = $state(readInitialData().pageSize);
  let photos = $state<GalleryPhoto[]>(readInitialData().photos);
  let currentPage = $state(readInitialData().page);
  let hasMore = $state(readInitialData().hasMore);
  let loadError = $state<string | null>(null);
  let isLoadingMore = $state(false);
  let loadSentinel = $state<HTMLElement | null>(null);
  let observer: IntersectionObserver | null = null;

  let activeSlug = $state<string | null>(readInitialData().active?.photoSlug ?? null);
  let activeImageId = $state<string | null>(readInitialData().active?.imageId ?? null);
  let prevGalleryHref = $state<string | null>(readInitialData().active?.prevGalleryHref ?? null);
  let nextGalleryHref = $state<string | null>(readInitialData().active?.nextGalleryHref ?? null);
  let controlsVisible = $state(true);
  let promoted = $state<TileAnimationSession | null>(null);
  let routeKey = $state(readInitialData().active ? `${readInitialData().active!.photoSlug}:${readInitialData().active!.imageId ?? ""}` : "");
  let querySignature = $state("");
  let mounted = $state(false);
  let hasHydratedRoute = Boolean(readInitialData().active);
  let skipNextRouteAnimation = false;
  let expectedRouteKeyFromGoto: string | null = null;

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

  /** Macromedia Flash-style preloader: only when on gallery grid (no active photo). */
  const PRELOADER_FADE_MS = 420;

  let preloadComplete = $state(false);
  let imagesLoaded = $state(0);
  let totalImages = $state(0);
  let preloaderVisible = $state(false);
  let galleryRevealed = $state(false);
  let preloadKey = $state("");

  let transitionQueue = Promise.resolve();
  let transitionsInFlight = $state(0);
  let pendingRouteApply = $state(false);
  const pendingDirectionQueue: Array<"prev" | "next"> = [];
  let directionDrainScheduled = false;
  let isClosing = $state(false);

  const tileRefs = new Map<string, HTMLElement>();

  const flushPendingRouteApply = () => {
    if (!pendingRouteApply) return;
    pendingRouteApply = false;
    void queueTransition(async () => {
      await applyRouteState(data.active, false);
    });
  };

  const drainDirectionQueue = () => {
    if (isClosing || !activeSlug) {
      pendingDirectionQueue.length = 0;
      directionDrainScheduled = false;
      return;
    }
    if (pendingDirectionQueue.length === 0) {
      directionDrainScheduled = false;
      if (!isClosing) {
        skipNextRouteAnimation = true;
        expectedRouteKeyFromGoto = `${activeSlug}:`;
        void goto(withCurrentSearch(`/photo/${activeSlug}`), {noScroll: true, keepFocus: true});
      }
      return;
    }
    directionDrainScheduled = true;
    const direction = pendingDirectionQueue.shift()!;
    const neighbors = direction === "next" ? localNeighborsFor(activeSlug ?? "").nextGalleryHref : localNeighborsFor(activeSlug ?? "").prevGalleryHref;
    const targetSlug = parseSlugFromPhotoHref(neighbors);
    if (!targetSlug) {
      drainDirectionQueue();
      return;
    }
    void queueTransition(async () => {
      if (isClosing) return;
      const localNeighbors = localNeighborsFor(targetSlug);
      prevGalleryHref = localNeighbors.prevGalleryHref;
      nextGalleryHref = localNeighbors.nextGalleryHref;
      await slideToNeighbor(targetSlug, direction);
    }).then(() => drainDirectionQueue());
  };

  const queueTransition = (work: () => Promise<void>) => {
    transitionQueue = transitionQueue
      .then(async () => {
        transitionsInFlight += 1;
        try {
          await work();
        } finally {
          transitionsInFlight = Math.max(0, transitionsInFlight - 1);
          if (transitionsInFlight === 0) {
            flushPendingRouteApply();
          }
        }
      })
      .catch((error) => {
        transitionsInFlight = 0;
        console.error("gallery-transition-failed", error);
        flushPendingRouteApply();
      });
    return transitionQueue;
  };

  const isTransitioning = $derived(transitionsInFlight > 0);

  const transitionCtx = getGalleryTransitionContext();
  const transitionPhase = $derived(transitionCtx.phase);
  const setPhase = transitionCtx.setPhase;
  const chromePanelHidden = $derived(transitionPhase === "fade-out-chrome" || transitionPhase === "scale-and-mask" || transitionPhase === "open" || transitionPhase === "closing-chrome" || transitionPhase === "closing-scale");
  const overlayChromeHidden = $derived(transitionPhase === "closing-chrome" || transitionPhase === "closing-scale");

  const registerTile = (node: HTMLElement, slug: string) => {
    tileRefs.set(slug, node);
    let currentSlug = slug;

    // Retroactively promote the tile if this is a direct photo entry and the gallery tile just mounted
    if (activeSlug === slug && !promoted) {
      void ensurePromotedTile(slug, activeImageId, false);
    }

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
      },
    };
  };

  const reducedMotion = () => (typeof window !== "undefined" ? window.matchMedia("(prefers-reduced-motion: reduce)").matches : false);

  const readHeaderHeight = () => {
    if (typeof window === "undefined") return 54;
    const raw = getComputedStyle(document.documentElement).getPropertyValue("--site-header-height").trim();
    const parsed = Number.parseFloat(raw);
    return Number.isFinite(parsed) ? parsed : 54;
  };

  const buildUrlParams = (includePage = false) => {
    const params = new URLSearchParams();
    if (query.trim()) params.set("q", query.trim());
    if (includePage && currentPage > 1) params.set("page", String(currentPage));
    return params;
  };

  const buildFeedParams = () => {
    const params = new URLSearchParams();
    params.set("page", String(currentPage + 1));
    params.set("pageSize", String(pageSize));
    if (query.trim()) params.set("q", query.trim());
    return params;
  };

  const withCurrentSearch = (href: string, includePage = false) => {
    const base = buildUrlParams(includePage).toString();
    return base ? `${href}?${base}` : href;
  };

  const navigateGalleryWithParams = (mutate: (params: URLSearchParams) => void) => {
    const params = new URLSearchParams();
    if (query.trim()) params.set("q", query.trim());
    if (currentPage > 1) params.set("page", String(currentPage));
    mutate(params);

    query = params.get("q")?.trim() ?? "";
    const pageParam = params.get("page");
    currentPage = pageParam !== null && Number.isFinite(Number.parseInt(pageParam, 10)) ? Number.parseInt(pageParam, 10) : 1;

    goto(params.toString() ? `/gallery?${params.toString()}` : "/gallery", {
      replaceState: true,
      noScroll: true,
      keepFocus: true,
    });
  };

  const colCount = $derived(Math.max(1, Math.min(data.maxDensity ?? 20, Number($galleryDensityStore) || 6)));
  const placeholderCount = $derived(Math.max(colCount, 6));
  const uniformRatio = $derived(Math.max(0.2, Number(data.uniformThumbRatio ?? 1)));
  const constrainedMax = $derived(data.maxContentWidthPx ?? 1600);
  const sectionMaxWidthStyle = $derived(widthMode === "constrained" ? `max-width: min(100%, ${constrainedMax}px);` : "max-width: 100%;");
  const canCycleGallery = $derived(Boolean(prevGalleryHref && nextGalleryHref));

  const activePhoto = $derived(activeSlug ? (photos.find((photo) => photo.slug === activeSlug) ?? null) : null);
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

  const offsetRect = (rect: {top: number; left: number; width: number; height: number}, deltaX: number) => ({
    top: rect.top,
    left: rect.left + deltaX,
    width: rect.width,
    height: rect.height,
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
      return {prevGalleryHref: null, nextGalleryHref: null};
    }

    const index = photos.findIndex((photo) => photo.slug === slug);
    if (index === -1) {
      return {prevGalleryHref: null, nextGalleryHref: null};
    }

    const prev = photos[(index - 1 + photos.length) % photos.length];
    const next = photos[(index + 1) % photos.length];
    return {
      prevGalleryHref: prev?.slug ? `/photo/${prev.slug}` : null,
      nextGalleryHref: next?.slug ? `/photo/${next.slug}` : null,
    };
  };

  /** Full browser window size for detail view (body overflow hidden when open = stable). */
  const getViewportSize = () => {
    if (typeof window === "undefined") return {width: 0, height: 0};
    return {
      width: window.innerWidth,
      height: window.innerHeight,
    };
  };

  /** Target rect for promoted photo: exact size and position of the contained scaled image. */
  const targetRectFor = (photo: GalleryPhoto, imageId: string | null, node?: HTMLElement | null) => {
    const {width: vw, height: vh} = getViewportSize();
    const img = imageFor(photo, imageId);
    let imgW = 1000;
    let imgH = 1000;

    if (img) {
      const parsed = parseDimensions(img.dimensions);
      if (parsed) {
        imgW = parsed.width;
        imgH = parsed.height;
      } else if (node) {
        const imgEl = node.querySelector("img");
        if (imgEl && imgEl.naturalWidth) {
          imgW = imgEl.naturalWidth;
          imgH = imgEl.naturalHeight;
        }
      }
    }

    // We pass 0 padding for top/bottom chrome since we want it completely full screen and centered
    return computeContainRect(vw, vh, imgW, imgH, 0, 0, 0, 0);
  };

  const ensurePromotedTile = async (slug: string, imageId: string | null, animate: boolean, durationMsOverride?: number) => {
    const photo = findPhoto(slug);
    if (!photo) return;

    const node = tileRefs.get(slug);
    if (!node) {
      activeSlug = slug;
      activeImageId = imageId;
      return;
    }

    const nextRect = targetRectFor(photo, imageId, node);
    const duration = durationMsOverride ?? (animate ? 520 : 0);
    const baseMotion = {
      reducedMotion: reducedMotion(),
      durationMs: duration,
      easing: "cubic-bezier(0.16, 1, 0.3, 1)",
    };

    if (promoted && promoted.slug !== slug) {
      releasePromotedTile(promoted);
      promoted = null;
    }

    if (!promoted) {
      const containerAspect = layoutMode === "uniform" ? uniformRatio : tileAspectRatio(photo);
      const imgCrop = imgCropFromForPhoto(photo, imageId, containerAspect);
      promoted = await promoteTile({
        slug,
        node,
        targetRect: nextRect,
        ...baseMotion,
        aspectRatio: containerAspect,
        imgCropFrom: imgCrop ?? undefined,
      });
    } else {
      await movePromotedTile(promoted, nextRect, baseMotion);
    }

    activeSlug = slug;
    activeImageId = imageId;
    revealControls();
  };

  const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

  const collapsePromotedTile = async (animate: boolean) => {
    pendingDirectionQueue.length = 0;
    directionDrainScheduled = false;

    if (!promoted) {
      activeSlug = null;
      activeImageId = null;
      if (typeof document !== "undefined") document.body.style.overflow = "";
      setPhase("idle");
      return;
    }

    const session = promoted;

    const placeholderRect = session.placeholder.getBoundingClientRect();
    const outOfView = placeholderRect.bottom < 0 || placeholderRect.top > window.innerHeight;
    if (outOfView) {
      session.placeholder.scrollIntoView({behavior: reducedMotion() ? "auto" : "smooth", block: "center"});
      if (!reducedMotion()) {
        await wait(260);
      }
    }

    if (!reducedMotion()) {
      setPhase("closing-chrome");
      await wait(CLOSING_CHROME_MS);
    }

    setPhase("closing-scale");
    activeSlug = null;
    activeImageId = null;

    if (typeof document !== "undefined") document.body.style.overflow = "";

    await demoteTile(session, {
      reducedMotion: reducedMotion(),
      durationMs: animate ? SCALE_MASK_MS : 0,
      easing: "cubic-bezier(0.16, 1, 0.3, 1)",
      imgEasing: "cubic-bezier(0.5, 0, 1, 1)",
      useCover: layoutMode === "uniform",
    });

    if (reducedMotion()) {
      await wait(150);
    }

    reinsertPromotedTile(session);
    promoted = null;
    setPhase("idle");
  };

  const applyRouteState = async (route: ActiveRoute | null, animate: boolean) => {
    if (!route) {
      isClosing = true;
      if (typeof document !== "undefined") document.body.style.overflow = "";
      await collapsePromotedTile(animate);
      prevGalleryHref = null;
      nextGalleryHref = null;
      return;
    }

    isClosing = false;
    if (typeof document !== "undefined") document.body.style.overflow = "hidden";
    setPhase("open");
    const switchingPhotos = Boolean(activeSlug && activeSlug !== route.photoSlug);
    await ensurePromotedTile(route.photoSlug, route.imageId, animate && !switchingPhotos);

    activeSlug = route.photoSlug;
    activeImageId = route.imageId;
    prevGalleryHref = route.prevGalleryHref;
    nextGalleryHref = route.nextGalleryHref;
  };

  const onSearchSubmit = (event: SubmitEvent) => {
    event.preventDefault();
    navigateGalleryWithParams((params) => {
      params.delete("page");
      if (!query.trim()) {
        params.delete("q");
        return;
      }
      params.set("q", query.trim());
    });
  };

  const onOpenPhoto = (event: MouseEvent, slug: string) => {
    event.preventDefault();
    isClosing = false;

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
          if (typeof document !== "undefined") document.body.style.overflow = "hidden";
          await ensurePromotedTile(slug, null, true);
          setPhase("open");
          return;
        }

        setPhase("fade-out-chrome");
        await wait(FADE_OUT_CHROME_MS);

        setPhase("scale-and-mask");
        activeSlug = slug;
        activeImageId = null;

        // Lock body scroll immediately so viewport is stable before computing rect
        if (typeof document !== "undefined") document.body.style.overflow = "hidden";

        // Wait for overlay to render and layout to settle before computing target rect
        await new Promise<void>((r) => {
          requestAnimationFrame(() => requestAnimationFrame(() => r()));
        });

        await ensurePromotedTile(slug, null, true, SCALE_MASK_MS);

        setPhase("open");
      });

      skipNextRouteAnimation = true;
      expectedRouteKeyFromGoto = `${slug}:`;
      await goto(withCurrentSearch(`/photo/${slug}`), {noScroll: true, keepFocus: true});
    })();
  };

  const closeToGallery = (event?: MouseEvent | KeyboardEvent) => {
    event?.preventDefault();
    isClosing = true;
    pendingDirectionQueue.length = 0;

    void (async () => {
      await queueTransition(async () => {
        await collapsePromotedTile(true);
      });

      skipNextRouteAnimation = true;
      expectedRouteKeyFromGoto = "";
      await goto(withCurrentSearch("/gallery", true), {noScroll: true, keepFocus: true});
    })();
  };

  const slideToNeighbor = async (targetSlug: string, direction: "prev" | "next") => {
    const targetPhoto = findPhoto(targetSlug);
    if (!targetPhoto) return false;

    const targetNode = tileRefs.get(targetSlug);
    if (!targetNode || !promoted || promoted.slug === targetSlug) {
      await ensurePromotedTile(targetSlug, null, false);
      return true;
    }

    const incomingFinalRect = targetRectFor(targetPhoto, null, targetNode);
    const {width: vw} = getViewportSize();
    const travel = Math.max(vw, incomingFinalRect.width + 72);
    const isNext = direction === "next";
    const incomingStartRect = offsetRect(incomingFinalRect, isNext ? travel : -travel);
    const outgoingEndRect = offsetRect(promoted.currentRect, isNext ? -travel : travel);

    const outgoingSession = promoted;
    const incomingContainerAspect = layoutMode === "uniform" ? uniformRatio : tileAspectRatio(targetPhoto);
    const incomingImgCrop = imgCropFromForPhoto(targetPhoto, null, incomingContainerAspect);
    const incomingSession = await promoteTile({
      slug: targetSlug,
      node: targetNode,
      targetRect: incomingStartRect,
      reducedMotion: true,
      durationMs: 0,
      aspectRatio: incomingContainerAspect,
      imgCropFrom: incomingImgCrop ?? undefined,
    });

    const motion = {
      reducedMotion: reducedMotion(),
      durationMs: 360,
      easing: "cubic-bezier(0.22, 1, 0.36, 1)",
    };

    await Promise.all([movePromotedTile(outgoingSession, outgoingEndRect, motion), movePromotedTile(incomingSession, incomingFinalRect, motion)]);

    // Atomic update to avoid one-frame flash of empty detail layer
    promoted = incomingSession;
    activeSlug = targetSlug;
    activeImageId = null;
    releasePromotedTile(outgoingSession);

    return true;
  };

  const onNeighborNavigate = (event: MouseEvent, _href: string | null, direction: "prev" | "next") => {
    event.preventDefault();
    if (!canCycleGallery || isClosing) return;

    pendingDirectionQueue.push(direction);
    if (!directionDrainScheduled) {
      drainDirectionQueue();
    }
  };

  const onSelectAdditionalImage = (event: MouseEvent, imageId: string) => {
    event.preventDefault();
    if (!activeSlug) return;
    isClosing = false;

    void (async () => {
      await queueTransition(async () => {
        activeImageId = imageId;
        const photo = findPhoto(activeSlug);
        if (photo && promoted) {
          const nextRect = targetRectFor(photo, imageId, promoted.node);
          await movePromotedTile(promoted, nextRect, {
            reducedMotion: reducedMotion(),
            durationMs: 260,
            easing: "cubic-bezier(0.2, 0.8, 0.2, 1)",
          });
        }
      });

      skipNextRouteAnimation = true;
      expectedRouteKeyFromGoto = `${activeSlug}:${imageId}`;
      await goto(withCurrentSearch(`/photo/${activeSlug}/${imageId}`), {noScroll: true, keepFocus: true});
    })();
  };

  const onPointerMove = () => {
    if (!activeSlug) return;
    revealControls();
  };

  const onKeydown = (event: KeyboardEvent) => {
    if (!activeSlug || event.repeat) return;

    if (event.key === "Escape") {
      closeToGallery(event);
      return;
    }

    if (event.key === "ArrowLeft" && prevGalleryHref) {
      onNeighborNavigate(event as unknown as MouseEvent, prevGalleryHref, "prev");
      return;
    }

    if (event.key === "ArrowRight" && nextGalleryHref) {
      onNeighborNavigate(event as unknown as MouseEvent, nextGalleryHref, "next");
    }
  };

  const shouldIgnoreSwipe = (target: EventTarget | null) => target instanceof HTMLElement && !!target.closest("[data-swipe-ignore]");

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
      void onNeighborNavigate(new MouseEvent("click"), nextGalleryHref, "next");
      return;
    }

    if (prevGalleryHref) {
      void onNeighborNavigate(new MouseEvent("click"), prevGalleryHref, "prev");
    }
  };

  const onResize = () => {
    if (!activeSlug || !promoted) return;

    void queueTransition(async () => {
      const photo = findPhoto(activeSlug);
      if (!photo || !promoted) return;
      const nextRect = targetRectFor(photo, activeImageId, promoted.node);
      await movePromotedTile(promoted, nextRect, {
        reducedMotion: true,
        durationMs: 0,
      });
    });
  };

  const setupViewportListeners = () => {
    if (typeof window === "undefined") return () => {};
    const vv = window.visualViewport;
    if (vv) {
      vv.addEventListener("resize", onResize);
      vv.addEventListener("scroll", onResize);
      return () => {
        vv.removeEventListener("resize", onResize);
        vv.removeEventListener("scroll", onResize);
      };
    }
    return () => {};
  };

  const loadNextPage = async () => {
    if (isLoadingMore || !hasMore || activeSlug) return;

    isLoadingMore = true;
    loadError = null;

    try {
      const params = buildFeedParams();

      const response = await fetch(`/gallery/feed?${params.toString()}`);
      if (!response.ok) {
        throw new Error("request-failed");
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
      loadError = "Could not load more photos.";
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
    const parsed = parseDimensions(photo.leadImage?.dimensions);
    if (parsed) return Math.max(0.2, parsed.width / parsed.height);
    // Fallback: read from the DOM img element's natural dimensions
    const node = tileRefs.get(photo.slug);
    const imgEl = node?.querySelector("img");
    if (imgEl && imgEl.naturalWidth && imgEl.naturalHeight) {
      return Math.max(0.2, imgEl.naturalWidth / imgEl.naturalHeight);
    }
    return uniformRatio;
  };

  /** Compute the tile aspect ratio for a given slug — used at animation time to get the real ratio from the DOM. */
  const tileAspectRatioForSlug = (slug: string) => {
    const photo = findPhoto(slug);
    if (!photo) return uniformRatio;
    return tileAspectRatio(photo);
  };

  const hasThumbCrop = (img: GalleryImage | null): boolean =>
    Boolean(img && img.thumb_crop_x != null && img.thumb_crop_y != null && img.thumb_crop_zoom != null && img.thumb_crop_zoom >= 1);

  const thumbCropStyle = (img: GalleryImage | null, containerAspect: number) => {
    if (!img || !hasThumbCrop(img)) return "";
    const parsed = parseDimensions(img.dimensions);
    const w = parsed?.width ?? 1;
    const h = parsed?.height ?? 1;
    const t = thumbCropTransform(img.thumb_crop_x ?? 0.5, img.thumb_crop_y ?? 0.5, img.thumb_crop_zoom ?? 1, w, h, containerAspect);
    return `object-fit: contain !important; transform: translate(${t.translateX}%, ${t.translateY}%) scale(${t.scale}); transform-origin: ${t.originX * 100}% ${t.originY * 100}%;`;
  };

  const imgCropFromForPhoto = (photo: GalleryPhoto, imageId: string | null, containerAspect: number) => {
    const img = imageFor(photo, imageId);
    if (!img || !hasThumbCrop(img)) return null;

    let imgAspect = 1;
    const parsed = parseDimensions(img.dimensions);
    if (parsed) {
      imgAspect = parsed.width / parsed.height;
    } else {
      const node = tileRefs.get(photo.slug);
      const imgEl = node?.querySelector("img");
      if (imgEl && imgEl.naturalWidth) {
        imgAspect = imgEl.naturalWidth / imgEl.naturalHeight;
      }
    }

    return cropToImgTransform(img.thumb_crop_x!, img.thumb_crop_y!, img.thumb_crop_zoom!, imgAspect, containerAspect);
  };

  const preloadImages = async () => {
    const toPreload = photos.filter((p) => p.leadImage).map((p) => photoPublicUrl(p.leadImage!.delivery_storage_path, GALLERY_DETAIL_SHARED_WIDTH));
    if (toPreload.length === 0) {
      preloadComplete = true;
      preloaderVisible = false;
      galleryRevealed = true;
      return;
    }

    totalImages = toPreload.length;
    imagesLoaded = 0;
    preloadComplete = false;
    galleryRevealed = false;

    const loadTasks = toPreload.map((url) => {
      const img = new Image();
      let settled = false;
      let completedSynchronously = false;

      const promise = new Promise<void>((resolve) => {
        const finish = () => {
          if (settled) return;
          settled = true;
          imagesLoaded += 1;
          resolve();
        };

        img.onload = finish;
        img.onerror = finish;
        img.src = url;
        if (img.complete) {
          completedSynchronously = true;
          finish();
        }
      });

      return {promise, completedSynchronously};
    });

    const synchronouslyLoaded = loadTasks.reduce((count, task) => count + (task.completedSynchronously ? 1 : 0), 0);
    if (synchronouslyLoaded === totalImages) {
      preloadComplete = true;
      preloaderVisible = false;
      galleryRevealed = true;
      return;
    }

    preloaderVisible = true;

    await Promise.all(loadTasks.map((task) => task.promise));
    preloadComplete = true;

    await new Promise((r) => setTimeout(r, PRELOADER_FADE_MS));
    preloaderVisible = false;

    await new Promise((r) => setTimeout(r, 80));
    galleryRevealed = true;
  };

  const shouldShowPreloader = $derived(!data.active && photos.length > 0 && !reducedMotion());

  onMount(() => {
    mounted = true;
    if (activeSlug && typeof document !== "undefined") {
      document.body.style.overflow = "hidden";
    }
    const prefs = getGalleryPrefs(data.maxDensity ?? 20);
    if (prefs) {
      galleryDensityStore.set(prefs.density);
      pageSize = prefs.pageSize;
    }
    // gap, layoutMode, widthMode come only from server (admin settings)
  });

  $effect(() => {
    if (!mounted) return;
    const key = (data.q ?? "") || "\0";
    if (!shouldShowPreloader) {
      if (photos.length > 0) {
        galleryRevealed = true;
        preloaderVisible = false;
        preloadKey = key;
      }
      return;
    }
    if (key === preloadKey) return;
    preloadKey = key;
    void preloadImages();
  });

  $effect(() => {
    if (!mounted) return;

    const nextQuerySignature = [data.q, data.page].join("|");
    if (nextQuerySignature !== querySignature) {
      querySignature = nextQuerySignature;
      query = data.q;
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

    const nextRouteKey = data.active ? `${data.active.photoSlug}:${data.active.imageId ?? ""}` : "";
    if (nextRouteKey === routeKey) return;

    if (expectedRouteKeyFromGoto !== null) {
      const match = nextRouteKey === expectedRouteKeyFromGoto || (expectedRouteKeyFromGoto.endsWith(":") && nextRouteKey.startsWith(expectedRouteKeyFromGoto));
      if (match) {
        expectedRouteKeyFromGoto = null;
        routeKey = nextRouteKey;
        hasHydratedRoute = true;
        return;
      }
    }

    const animate = hasHydratedRoute && !skipNextRouteAnimation;
    skipNextRouteAnimation = false;
    routeKey = nextRouteKey;
    hasHydratedRoute = true;

    if (transitionsInFlight > 0) {
      pendingRouteApply = true;
      return;
    }

    void queueTransition(async () => {
      await applyRouteState(data.active, animate);
    });
  });

  $effect(() => {
    if (!activeSlug) return;
    const teardown = setupViewportListeners();
    return teardown;
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
      {rootMargin: "600px 0px"},
    );

    observer.observe(loadSentinel);
    return teardownObserver;
  });

  onDestroy(() => {
    teardownObserver();
    if (hideTimer) clearTimeout(hideTimer);
    if (typeof document !== "undefined") document.body.style.overflow = "";
    if (promoted) {
      releasePromotedTile(promoted);
      promoted = null;
    }
  });
</script>

<svelte:window onresize={onResize} onmousemove={onPointerMove} onkeydown={onKeydown} ontouchstart={onTouchStart} ontouchend={onTouchEnd} />

<GalleryPreloader
  visible={preloaderVisible}
  enabled={shouldShowPreloader}
  {imagesLoaded}
  {totalImages}
  fadeMs={PRELOADER_FADE_MS}
/>

<section class="mx-auto w-full px-4 py-5" style={sectionMaxWidthStyle}>
  {#if photos.length === 0}
    <p class="py-16 text-center text-sm uppercase tracking-[var(--tracking-label)] text-text-muted">No photos found.</p>
  {:else}
    <GalleryTiles
      {photos}
      {layoutMode}
      {colCount}
      {gap}
      uniformRatio={uniformRatio}
      {placeholderCount}
      {isLoadingMore}
      {galleryRevealed}
      reducedMotion={reducedMotion()}
      {withCurrentSearch}
      {onOpenPhoto}
      {registerTile}
      {hasThumbCrop}
      {thumbCropStyle}
      {tileAspectRatio}
    />

    {#if hasMore}
      <div bind:this={loadSentinel} class="h-10 w-full"></div>
    {/if}

    {#if isLoadingMore}
      <p class="py-4 text-center text-xs uppercase tracking-[var(--tracking-label)] text-text-subtle">Loading more</p>
    {/if}

    {#if loadError}
      <div class="py-4 text-center text-sm">
        <p>{loadError}</p>
        <button class="mt-2 rounded border border-border-strong px-3 py-1 text-xs uppercase tracking-[var(--tracking-label)]" type="button" onclick={() => void loadNextPage()}>Retry</button>
      </div>
    {/if}
  {/if}
</section>

{#if activePhoto && currentImage}
  <GalleryDetailOverlay
    {activePhoto}
    currentImage={currentImage}
    promoted={Boolean(promoted)}
    transitionPhase={transitionPhase}
    {controlsVisible}
    {overlayChromeHidden}
    {isTransitioning}
    {canCycleGallery}
    {prevGalleryHref}
    {nextGalleryHref}
    {withCurrentSearch}
    {closeToGallery}
    {onNeighborNavigate}
    {onSelectAdditionalImage}
    {portal}
    scaleMaskMs={SCALE_MASK_MS}
    closingChromeMs={CLOSING_CHROME_MS}
  />
{/if}
