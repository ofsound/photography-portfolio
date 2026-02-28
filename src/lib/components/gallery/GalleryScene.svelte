<script lang="ts">
  import {goto} from "$app/navigation";
  import {fade} from "svelte/transition";
  import {onDestroy, onMount} from "svelte";
  import {getGalleryTransitionContext} from "$lib/context/gallery-transition";
  import {getGalleryPrefs, setGalleryPrefs} from "$lib/stores/gallery-prefs";

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

  let density = $state(readInitialData().density);
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

  let activeSlug = $state<string | null>(null);
  let activeImageId = $state<string | null>(null);
  let prevGalleryHref = $state<string | null>(null);
  let nextGalleryHref = $state<string | null>(null);
  let controlsVisible = $state(true);
  let promoted = $state<TileAnimationSession | null>(null);
  let routeKey = $state("");
  let querySignature = $state("");
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

  /** Macromedia Flash-style preloader: only when on gallery grid (no active photo). */
  const PRELOADER_FADE_MS = 420;
  const CASCADE_STAGGER_MS = 42;
  const CASCADE_DURATION_MS = 520;

  let preloadComplete = $state(false);
  let imagesLoaded = $state(0);
  let totalImages = $state(0);
  let preloaderVisible = $state(true);
  let galleryRevealed = $state(false);
  let preloadKey = $state("");

  let transitionQueue = Promise.resolve();
  let transitionsInFlight = $state(0);
  let pendingRouteApply = $state(false);
  const pendingDirectionQueue: Array<"prev" | "next"> = [];
  let directionDrainScheduled = false;

  const tileRefs = new Map<string, HTMLElement>();

  const flushPendingRouteApply = () => {
    if (!pendingRouteApply) return;
    pendingRouteApply = false;
    void queueTransition(async () => {
      await applyRouteState(data.active, false);
    });
  };

  const drainDirectionQueue = () => {
    if (!activeSlug) {
      pendingDirectionQueue.length = 0;
      directionDrainScheduled = false;
      return;
    }
    if (pendingDirectionQueue.length === 0) {
      directionDrainScheduled = false;
      skipNextRouteAnimation = true;
      void goto(withCurrentSearch(`/photo/${activeSlug}`), {noScroll: true, keepFocus: true});
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

  const colCount = $derived(Math.max(1, Math.min(data.maxDensity ?? 20, Number(density) || 6)));
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
    if (!promoted) return;

    pendingDirectionQueue.length = 0;
    directionDrainScheduled = false;

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

    await wait(reducedMotion() ? 150 : SCALE_MASK_MS);

    reinsertPromotedTile(session);
    promoted = null;
    setPhase("idle");
  };

  const applyRouteState = async (route: ActiveRoute | null, animate: boolean) => {
    if (!route) {
      if (typeof document !== "undefined") document.body.style.overflow = "";
      await collapsePromotedTile(animate);
      prevGalleryHref = null;
      nextGalleryHref = null;
      return;
    }

    if (typeof document !== "undefined") document.body.style.overflow = "hidden";
    setPhase("open");
    const switchingPhotos = Boolean(activeSlug && activeSlug !== route.photoSlug);
    await ensurePromotedTile(route.photoSlug, route.imageId, animate && !switchingPhotos);

    activeSlug = route.photoSlug;
    activeImageId = route.imageId;
    prevGalleryHref = route.prevGalleryHref;
    nextGalleryHref = route.nextGalleryHref;
  };

  const updateDensity = (next: number) => {
    density = next;
    setGalleryPrefs({density}, data.maxDensity ?? 20);
  };

  const updateGap = (next: number) => {
    gap = Math.max(0, Math.min(20, next));
    setGalleryPrefs({gap}, data.maxDensity ?? 20);
  };

  const updateLayoutMode = (next: "uniform" | "masonry") => {
    layoutMode = next;
    setGalleryPrefs({layoutMode}, data.maxDensity ?? 20);
  };

  const updateWidthMode = (next: "full" | "constrained") => {
    widthMode = next;
    setGalleryPrefs({widthMode}, data.maxDensity ?? 20);
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
      await goto(withCurrentSearch(`/photo/${slug}`), {noScroll: true, keepFocus: true});
    })();
  };

  const closeToGallery = (event?: MouseEvent | KeyboardEvent) => {
    event?.preventDefault();

    void (async () => {
      await queueTransition(async () => {
        await collapsePromotedTile(true);
      });

      skipNextRouteAnimation = true;
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

    releasePromotedTile(outgoingSession);
    promoted = incomingSession;
    activeSlug = targetSlug;
    activeImageId = null;

    return true;
  };

  const onNeighborNavigate = (event: MouseEvent, _href: string | null, direction: "prev" | "next") => {
    event.preventDefault();
    if (!canCycleGallery) return;

    pendingDirectionQueue.push(direction);
    if (!directionDrainScheduled) {
      drainDirectionQueue();
    }
  };

  const onSelectAdditionalImage = (event: MouseEvent, imageId: string) => {
    event.preventDefault();
    if (!activeSlug) return;

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
      await goto(withCurrentSearch(`/photo/${activeSlug}/${imageId}`), {noScroll: true, keepFocus: true});
    })();
  };

  const onPointerMove = () => {
    if (!activeSlug) return;
    revealControls();
  };

  const onKeydown = (event: KeyboardEvent) => {
    if (!activeSlug) return;

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
    if (!parsed) return uniformRatio;
    return Math.max(0.2, parsed.width / parsed.height);
  };

  const hasThumbCrop = (img: {thumb_crop_x?: number | null; thumb_crop_y?: number | null; thumb_crop_zoom?: number | null} | null) => img && img.thumb_crop_x != null && img.thumb_crop_y != null && img.thumb_crop_zoom != null && img.thumb_crop_zoom >= 1;

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
    preloaderVisible = true;
    galleryRevealed = false;

    const loadOne = (url: string) =>
      new Promise<void>((resolve) => {
        const img = new Image();
        img.onload = () => {
          imagesLoaded += 1;
          resolve();
        };
        img.onerror = () => {
          imagesLoaded += 1;
          resolve();
        };
        img.src = url;
      });

    await Promise.all(toPreload.map(loadOne));
    preloadComplete = true;

    await new Promise((r) => setTimeout(r, PRELOADER_FADE_MS));
    preloaderVisible = false;

    await new Promise((r) => setTimeout(r, 80));
    galleryRevealed = true;
  };

  const shouldShowPreloader = $derived(!data.active && photos.length > 0 && !reducedMotion());

  onMount(() => {
    mounted = true;
    const prefs = getGalleryPrefs(data.maxDensity ?? 20);
    if (prefs) {
      density = prefs.density;
      gap = prefs.gap;
      layoutMode = prefs.layoutMode;
      widthMode = prefs.widthMode;
      pageSize = prefs.pageSize;
    }
  });

  $effect(() => {
    if (!mounted) return;
    if (!shouldShowPreloader) {
      if (photos.length > 0) {
        galleryRevealed = true;
        preloaderVisible = false;
      }
      return;
    }
    const key = (data.q ?? "") || "\0";
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
    if (!activeSlug || typeof document === "undefined") return;
    const el = document.querySelector("[data-full-viewport]");
    if (el) {
      const rect = el.getBoundingClientRect();
      const computed = getComputedStyle(el);
      console.debug("[gallery] data-full-viewport", {
        rect: {width: rect.width, height: rect.height, left: rect.left, top: rect.top},
        width: computed.width,
        maxWidth: computed.maxWidth,
        position: computed.position,
        viewport: {w: window.innerWidth, h: window.innerHeight},
      });
    }
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

{#if preloaderVisible && shouldShowPreloader}
  <div transition:fade={{duration: PRELOADER_FADE_MS}} class="preloader-overlay" role="status" aria-live="polite" aria-label="Loading gallery">
    <div class="preloader-content">
      <p class="preloader-text">Loading {imagesLoaded} of {totalImages}</p>
      <div class="preloader-bar-track">
        <div class="preloader-bar-fill" style="width: {totalImages > 0 ? (imagesLoaded / totalImages) * 100 : 0}%"></div>
      </div>
    </div>
  </div>
{/if}

<section class="mx-auto w-full px-4 py-5" style={sectionMaxWidthStyle}>
  <div class="chrome-panel sticky top-[var(--sticky-offset)] z-30 mb-5 grid gap-2 rounded px-3 py-2 text-xs uppercase tracking-[var(--tracking-heading)] transition-opacity duration-[var(--duration-chrome)] ease-out lg:grid-cols-[1fr_auto] lg:items-center" class:opacity-0={chromePanelHidden}>
    <form class="flex flex-1 items-center gap-2" onsubmit={onSearchSubmit}>
      <input name="q" bind:value={query} placeholder="Search title, description, tags, category" class="w-full rounded border border-border bg-transparent px-2 py-1" />
      <button class="rounded border border-border-strong px-2 py-1" type="submit">Search</button>
    </form>

    <div class="flex flex-wrap items-center justify-end gap-3">
      <label class="flex items-center gap-2">
        Density
        <input type="range" min="1" max={String(data.maxDensity ?? 20)} value={colCount} oninput={(e) => updateDensity(Number((e.currentTarget as HTMLInputElement).value))} />
        <span class="tabular-nums">{colCount}</span>
      </label>

      <label class="flex items-center gap-2">
        Gap
        <input type="range" min="0" max="20" value={gap} oninput={(e) => updateGap(Number((e.currentTarget as HTMLInputElement).value))} />
        <span class="tabular-nums">{gap}px</span>
      </label>

      <div class="flex items-center gap-1">
        <button type="button" class="rounded border border-border-strong px-2 py-1 {layoutMode === 'uniform' ? 'bg-border' : 'opacity-40'}" onclick={() => updateLayoutMode("uniform")} disabled={layoutMode === "uniform"}>Uniform</button>
        <button type="button" class="rounded border border-border-strong px-2 py-1 {layoutMode === 'masonry' ? 'bg-border' : 'opacity-40'}" onclick={() => updateLayoutMode("masonry")} disabled={layoutMode === "masonry"}>Masonry</button>
      </div>

      <div class="flex items-center gap-1">
        <button type="button" class="rounded border border-border-strong px-2 py-1 {widthMode === 'full' ? 'bg-border' : 'opacity-40'}" onclick={() => updateWidthMode("full")} disabled={widthMode === "full"}>Full</button>
        <button type="button" class="rounded border border-border-strong px-2 py-1 {widthMode === 'constrained' ? 'bg-border' : 'opacity-40'}" onclick={() => updateWidthMode("constrained")} disabled={widthMode === "constrained"}>Constrained</button>
      </div>
    </div>
  </div>

  {#if photos.length === 0}
    <p class="py-16 text-center text-sm uppercase tracking-[var(--tracking-label)] text-text-muted">No photos found.</p>
  {:else}
    {#if layoutMode === "uniform"}
      <ul class="grid" style={`grid-template-columns: repeat(${colCount}, minmax(0, 1fr)); gap: ${gap}px;`}>
        {#each photos as photo, index (photo.id)}
          <li>
            <div class="tile-cascade" class:revealed={galleryRevealed} class:no-motion={reducedMotion()} style="animation-delay: {galleryRevealed && !reducedMotion() ? index * CASCADE_STAGGER_MS : 0}ms">
              <a href={withCurrentSearch(`/photo/${photo.slug}`)} use:registerTile={photo.slug} class="group relative block overflow-hidden rounded" style={`aspect-ratio: ${uniformRatio};`} onclick={(event) => onOpenPhoto(event, photo.slug)}>
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
          {#each Array.from({length: placeholderCount}) as _, index (index)}
            <li class="animate-pulse rounded bg-surface-muted" style={`aspect-ratio: ${uniformRatio};`}></li>
          {/each}
        {/if}
      </ul>
    {:else}
      <ul class="columns-2 md:columns-4 lg:columns-6" style={`columns: ${colCount}; column-gap: ${gap}px;`}>
        {#each photos as photo, index (photo.id)}
          <li class="break-inside-avoid" style="margin-bottom: {gap}px">
            <div class="tile-cascade" class:revealed={galleryRevealed} class:no-motion={reducedMotion()} style="animation-delay: {galleryRevealed && !reducedMotion() ? index * CASCADE_STAGGER_MS : 0}ms">
              <a href={withCurrentSearch(`/photo/${photo.slug}`)} use:registerTile={photo.slug} class="group relative block overflow-hidden rounded" style={`aspect-ratio: ${tileAspectRatio(photo)};`} onclick={(event) => onOpenPhoto(event, photo.slug)}>
                {#if photo.leadImage}
                  <img
                    src={photoPublicUrl(photo.leadImage.delivery_storage_path, GALLERY_DETAIL_SHARED_WIDTH)}
                    alt={photo.leadImage.alt_text ?? photo.title}
                    class="tile-img transition-transform duration-500 ease-cinematic {hasThumbCrop(photo.leadImage) ? 'tile-img-crop' : 'group-hover:scale-[1.02]'}"
                    style={thumbCropStyle(photo.leadImage, tileAspectRatio(photo))}
                    loading="eager"
                  />
                {/if}
              </a>
            </div>
          </li>
        {/each}

        {#if isLoadingMore}
          {#each Array.from({length: placeholderCount}) as _, index (index)}
            <li class="break-inside-avoid animate-pulse rounded bg-surface-muted" style={`height: ${120 + (index % 5) * 34}px; margin-bottom: ${gap}px;`}></li>
          {/each}
        {/if}
      </ul>
    {/if}

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
  <div use:portal transition:fade={{duration: SCALE_MASK_MS}} class="fixed inset-0 z-[60] pointer-events-none bg-black"></div>

  {#if !promoted && transitionPhase !== "scale-and-mask"}
    <div use:portal data-full-viewport class="fixed inset-0 z-[65] pointer-events-none flex items-center justify-center p-0 m-0" aria-hidden="true">
      <img src={photoPublicUrl(currentImage.delivery_storage_path, GALLERY_DETAIL_SHARED_WIDTH)} alt={currentImage.alt_text ?? activePhoto.title} class="max-h-full max-w-full w-auto h-auto object-contain" />
    </div>
  {/if}

  {#if controlsVisible}
    <div use:portal class="fixed inset-0 z-[80] pointer-events-none transition-opacity ease-out" class:opacity-0={overlayChromeHidden} style="transition-duration: {CLOSING_CHROME_MS}ms" aria-hidden="true">
      <a
        href={withCurrentSearch("/gallery")}
        onclick={closeToGallery}
        class="chrome-panel pointer-events-auto fixed left-4 top-[calc(var(--site-header-height,var(--size-header))+14px)] rounded px-3 py-2 text-xs uppercase tracking-[var(--tracking-heading)]"
        class:pointer-events-none={isTransitioning}
        class:opacity-50={isTransitioning}
      >
        Close
      </a>

      {#if canCycleGallery}
        <a href={prevGalleryHref ? withCurrentSearch(prevGalleryHref) : "#"} onclick={(event) => onNeighborNavigate(event, prevGalleryHref, "prev")} class="chrome-panel pointer-events-auto fixed left-0 top-1/2 -translate-y-1/2 px-4 py-5 text-lg" aria-label="Previous image">←</a>

        <a href={nextGalleryHref ? withCurrentSearch(nextGalleryHref) : "#"} onclick={(event) => onNeighborNavigate(event, nextGalleryHref, "next")} class="chrome-panel pointer-events-auto fixed right-0 top-1/2 -translate-y-1/2 px-4 py-5 text-lg" aria-label="Next image">→</a>
      {/if}
    </div>
  {/if}

  <aside
    use:portal
    class="chrome-panel fixed left-[var(--inset-overlay)] bottom-[var(--inset-overlay)] z-[var(--z-overlay)] w-fit max-w-[min(90vw,var(--max-width-prose))] rounded px-4 py-3 transition-opacity ease-out"
    class:opacity-0={overlayChromeHidden}
    style="transition-duration: {CLOSING_CHROME_MS}ms"
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
          <a href={withCurrentSearch(`/photo/${activePhoto.slug}/${image.id}`)} onclick={(event) => onSelectAdditionalImage(event, image.id)} class="block shrink-0 overflow-hidden rounded border border-border-strong">
            <img src={photoPublicUrl(image.delivery_storage_path, 180)} alt={image.alt_text ?? activePhoto.title} class="h-14 w-20 object-cover" loading="lazy" />
          </a>
        {/each}
      </div>
    {/if}
  </aside>
{/if}

<style>
  .tile-img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }

  .tile-img-crop {
    object-fit: contain !important;
  }

  :global([data-promoted] .tile-img) {
    object-fit: contain;
  }

  .preloader-overlay {
    position: fixed;
    inset: 0;
    z-index: 50;
    pointer-events: none;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--color-bg);
  }

  .preloader-content {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
    min-width: 280px;
    max-width: 90vw;
  }

  .preloader-text {
    font-size: 0.75rem;
    font-weight: 600;
    letter-spacing: 0.2em;
    text-transform: uppercase;
    color: var(--color-text-muted);
    font-variant-numeric: tabular-nums;
  }

  .preloader-bar-track {
    width: 100%;
    height: 8px;
    background: linear-gradient(to bottom, color-mix(in srgb, var(--color-border) 60%, transparent), color-mix(in srgb, var(--color-border-strong) 80%, transparent));
    border: 1px solid var(--color-border-strong);
    border-radius: 2px;
    overflow: hidden;
    box-shadow:
      inset 0 1px 2px rgba(0, 0, 0, 0.15),
      0 1px 0 rgba(255, 255, 255, 0.4);
  }

  .preloader-bar-fill {
    height: 100%;
    background: linear-gradient(to bottom, color-mix(in srgb, var(--color-brand) 90%, white), var(--color-brand));
    border-radius: 1px;
    transition: width 0.12s ease-out;
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.35);
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
