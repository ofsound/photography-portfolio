<script lang="ts">
  import { goto } from '$app/navigation';
  import { resolve } from '$app/paths';
  import { onDestroy, onMount, tick } from 'svelte';
  import { SvelteMap, SvelteSet } from 'svelte/reactivity';
  import GalleryDetailViewer from './scene/GalleryDetailViewer.svelte';
  import GalleryGrid from './scene/GalleryGrid.svelte';
  import GalleryPreloader from './scene/GalleryPreloader.svelte';
  import { createGalleryTransitionQueue } from './scene/GalleryTransitionQueue.svelte';
  import { getGalleryTransitionContext } from '$lib/context/gallery-transition';
  import {
    galleryDensityStore,
    layoutModeStore,
  } from '$lib/stores/gallery-prefs.svelte';
  import { parseDimensions } from '$lib/utils/parse-dimensions';
  import {
    GALLERY_DETAIL_SHARED_WIDTH,
    photoPublicUrl,
  } from '$lib/utils/storage-url';
  import { normalizeThumbCropAspect } from '$lib/utils/thumb-crop';
  import {
    createGallerySceneState,
    routeKeyFromActive,
  } from './scene/createGallerySceneState.svelte';
  import { createGalleryClassicViewer } from './scene/useGalleryClassicViewer.svelte';
  import { createGalleryContactSheetViewer } from './scene/useGalleryContactSheetViewer.svelte';
  import { createGalleryLayout } from './scene/useGalleryLayout.svelte';
  import { createGalleryNavigation } from './scene/useGalleryNavigation.svelte';
  import { createGalleryPagination } from './scene/useGalleryPagination.svelte';
  import {
    createGalleryRouter,
    matchesExpectedRouteKey,
    routeKeyFor,
  } from './scene/useGalleryRouter.svelte';
  import { createGalleryTileAnimator } from './scene/useGalleryTileAnimator.svelte';
  import { normalizeThumbnailEntrancePreset } from '$lib/constants/thumbnail-entrance';
  import { normalizePreloaderPreset } from '$lib/constants/preloader-preset';
  import { normalizeNavButtonPreset } from '$lib/constants/nav-button-preset';
  import { resolveThumbnailEntrancePresetRuntime } from './scene/thumbnail-entrance-presets';

  import type { GalleryPhoto } from '$lib/types/content';
  import type { GalleryGridModel } from './scene/gallery-grid-model';
  import type { GalleryViewerController } from './scene/gallery-viewer-controller';
  import type {
    ActiveRoute,
    DetailViewMode,
    GalleryImage,
    PhotographInfoMode,
    ViewerData,
  } from './scene/gallery-scene.types';

  const { data } = $props<{ data: ViewerData }>();
  const readInitialData = () => data;

  const state = createGallerySceneState(readInitialData());
  let detailBottomInsetPx = 0;
  const layoutMode = $derived(layoutModeStore.value);

  const routeScopeSlug = $derived(
    readInitialData().galleryScope?.slug ?? 'all',
  );
  let initializedScopeSlug: string | null = null;

  const router = createGalleryRouter({
    getRouteScopeSlug: () => routeScopeSlug,
    getQuery: () => state.query,
    getCurrentPage: () => state.currentPage,
    getPageSize: () => state.pageSize,
    getPhotos: () => state.photos,
  });

  const FADE_OUT_CHROME_MS = 280;
  const SCALE_MASK_MS = 520;
  const CLOSING_CHROME_MS = 180;

  const PRELOADER_FADE_MS = 420;

  const PRELOADER_EXIT_MS: Record<string, number> = {
    minimal: 420,
    curtain: 800,
    iris: 700,
    veil: 650,
    diagonal: 800,
    filmBurn: 600,
  };

  const preloaderPreset = $derived(
    normalizePreloaderPreset(data.gallerySettings?.preloader_preset),
  );

  const preloaderExitMs = $derived(
    PRELOADER_EXIT_MS[preloaderPreset] ?? PRELOADER_FADE_MS,
  );

  const transitionQueue = createGalleryTransitionQueue({
    onError: (error) => {
      console.error('gallery-transition-failed', error);
    },
  });

  const isTransitioning = $derived(transitionQueue.isTransitioning);

  const transitionCtx = getGalleryTransitionContext();
  const transitionPhase = $derived(transitionCtx.phase);
  const setPhase = transitionCtx.setPhase;
  const overlayChromeHidden = $derived(
    transitionPhase === 'closing-chrome' || transitionPhase === 'closing-scale',
  );

  const portal = (node: HTMLElement) => {
    if (typeof document !== 'undefined' && document.body) {
      document.body.appendChild(node);
    }

    return {
      destroy() {
        node.remove();
      },
    };
  };

  const reducedMotion = () =>
    typeof window !== 'undefined'
      ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
      : false;
  const isMobileViewport = () =>
    typeof window !== 'undefined'
      ? window.matchMedia('(max-width: 767px)').matches
      : false;
  const detectSafariBrowser = () => {
    if (typeof window === 'undefined') return false;

    const { userAgent, vendor } = window.navigator;
    const isAppleVendor = /Apple/i.test(vendor);
    const hasSafariToken = /Safari/i.test(userAgent);
    const hasOtherBrowserToken =
      /(Chrome|CriOS|Chromium|EdgiOS|FxiOS|OPiOS|OPR|SamsungBrowser|DuckDuckGo|YaBrowser)/i.test(
        userAgent,
      );

    return isAppleVendor && hasSafariToken && !hasOtherBrowserToken;
  };
  const safariSmoothMode = () => detectSafariBrowser();

  const colCount = $derived(
    Math.max(
      1,
      Math.min(data.maxDensity ?? 20, Number(galleryDensityStore.value) || 6),
    ),
  );

  const placeholderCount = $derived(Math.max(colCount, 6));

  const uniformRatio = $derived(
    normalizeThumbCropAspect(data.uniformThumbRatio),
  );

  const naturalAspectRatio = (photo: GalleryPhoto) => {
    const parsed = parseDimensions(photo.leadImage?.dimensions);
    if (parsed) {
      return Math.max(0.2, parsed.width / parsed.height);
    }
    return uniformRatio;
  };

  const thumbnailEntrancePreset = $derived(
    normalizeThumbnailEntrancePreset(
      data.gallerySettings?.thumbnail_entrance_preset,
    ),
  );

  const thumbnailEntranceRuntime = $derived(
    resolveThumbnailEntrancePresetRuntime(thumbnailEntrancePreset),
  );
  const entranceEligibleSlugs = new SvelteSet<string>();
  const entranceRanks = new SvelteMap<string, number>();
  let resolvedEntranceBatchKey = -1;
  let entranceUnlockTimer: ReturnType<typeof setTimeout> | null = null;

  const clearEntranceLock = () => {
    if (entranceUnlockTimer) {
      clearTimeout(entranceUnlockTimer);
      entranceUnlockTimer = null;
    }
  };

  const startEntranceBatch = (photos: GalleryPhoto[]) => {
    state.entranceBatchKey += 1;
    state.entranceOrderReady = false;
    state.entranceOrderCount = 0;
    resolvedEntranceBatchKey = -1;

    entranceEligibleSlugs.clear();
    entranceRanks.clear();
    for (const photo of photos) {
      entranceEligibleSlugs.add(photo.slug);
    }

    clearEntranceLock();
    if (photos.length === 0) {
      state.entranceOrderReady = true;
      state.entranceLocked = false;
      resolvedEntranceBatchKey = state.entranceBatchKey;
      return;
    }

    if (
      state.entranceSequenceComplete ||
      reducedMotion() ||
      state.contactSheetEntranceFxDisabled
    ) {
      state.entranceOrderReady = true;
      state.entranceLocked = false;
      resolvedEntranceBatchKey = state.entranceBatchKey;
      return;
    }

    state.entranceLocked = true;
  };

  const onResolveEntranceOrder = (batchKey: number, orderedSlugs: string[]) => {
    if (batchKey !== state.entranceBatchKey) return;
    if (batchKey === resolvedEntranceBatchKey) return;

    resolvedEntranceBatchKey = batchKey;
    entranceRanks.clear();

    let rank = 0;
    for (const slug of orderedSlugs) {
      if (!entranceEligibleSlugs.has(slug)) continue;
      if (entranceRanks.has(slug)) continue;
      entranceRanks.set(slug, rank);
      rank += 1;
    }

    state.entranceOrderReady = true;
    state.entranceOrderCount = rank;

    if (rank === 0 || reducedMotion()) {
      clearEntranceLock();
      state.entranceLocked = false;
      state.entranceSequenceComplete = true;
    }
  };

  const entranceFx = (slug: string, fallbackRank: number) => {
    const eligible = entranceEligibleSlugs.has(slug);
    if (
      !eligible ||
      reducedMotion() ||
      state.entranceSequenceComplete ||
      state.contactSheetEntranceFxDisabled
    ) {
      return {
        className: 'thumb-entrance-fx',
        style: '',
      };
    }

    if (!state.galleryRevealed || !state.entranceOrderReady) {
      return {
        className: 'thumb-entrance-fx thumb-entrance-fx--await',
        style: '',
      };
    }

    const rank = entranceRanks.get(slug) ?? fallbackRank;
    const motion = thumbnailEntranceRuntime.buildMotion({ rank });
    return {
      className: `thumb-entrance-fx ${motion.className}`,
      style: `--thumb-entrance-delay: ${motion.delayMs}ms; --thumb-entrance-duration: ${motion.durationMs}ms;`,
    };
  };

  let layout!: ReturnType<typeof createGalleryLayout>;

  const getContainerAspectForPhoto = (photo: GalleryPhoto) => {
    if (layoutMode === 'rows') {
      return layout.rowsDisplayAspect(photo);
    }

    if (layoutMode === 'columns') {
      return layout.columnsDisplayAspect(photo);
    }

    if (layoutMode === 'coverage') {
      return layout.coverageAspect;
    }

    if (layoutMode === 'uniform') {
      return uniformRatio;
    }

    return naturalAspectRatio(photo);
  };

  const detailViewMode = $derived.by<DetailViewMode>(() => {
    return data.gallerySettings?.detail_view_mode === 'contact_sheet'
      ? 'contact_sheet'
      : 'classic';
  });

  const photographInfoMode = $derived.by<PhotographInfoMode>(() => {
    const configuredMode = data.gallerySettings?.photograph_info_mode;
    if (
      configuredMode === 'hidden' ||
      configuredMode === 'floating' ||
      configuredMode === 'bottom_dock'
    ) {
      return configuredMode;
    }
    return data.gallerySettings?.show_photograph_info === false
      ? 'hidden'
      : 'floating';
  });

  const tileAnimator = createGalleryTileAnimator({
    state,
    getLayoutMode: () => layoutMode,
    getUniformRatio: () => uniformRatio,
    getContainerAspect: getContainerAspectForPhoto,
    getDetailBottomInset: () =>
      state.activeSlug && photographInfoMode === 'bottom_dock'
        ? detailBottomInsetPx
        : 0,
    reducedMotion,
    setPhase,
    scaleMaskMs: SCALE_MASK_MS,
    closingChromeMs: CLOSING_CHROME_MS,
  });

  const classicViewer = createGalleryClassicViewer({
    tileAnimator,
  });

  const contactSheetViewer = createGalleryContactSheetViewer({
    state,
    reducedMotion,
    isMobileViewport,
    smoothSafariMode: safariSmoothMode,
    getSettings: () => ({
      perspectivePx: data.gallerySettings?.contact_sheet_perspective_px ?? 1200,
      rotateXDeg: data.gallerySettings?.contact_sheet_rotate_x_deg ?? 8,
      rotateYDeg: data.gallerySettings?.contact_sheet_rotate_y_deg ?? 10,
      travelZPx: data.gallerySettings?.contact_sheet_travel_z_px ?? 96,
      targetFillPct:
        data.gallerySettings?.contact_sheet_target_fill_pct ?? 0.38,
      mobileIntensityPct:
        data.gallerySettings?.contact_sheet_mobile_intensity_pct ?? 55,
    }),
    onRetargetRequest: (slug: string) => {
      void onRetargetPhoto(slug);
    },
  });

  const disableChromeBlurForSafariContactSheet = $derived(
    safariSmoothMode() &&
      detailViewMode === 'contact_sheet' &&
      Boolean(state.activeSlug) &&
      isTransitioning,
  );

  const viewerController = $derived.by<GalleryViewerController>(() =>
    detailViewMode === 'contact_sheet' ? contactSheetViewer : classicViewer,
  );

  layout = createGalleryLayout({
    state,
    getLayoutMode: () => layoutMode,
    getTileAspectRatio: tileAnimator.tileAspectRatio,
  });

  const constrainedMax = $derived(data.maxContentWidthPx ?? 1600);

  const sectionMaxWidthStyle = $derived(
    state.widthMode === 'constrained'
      ? `max-width: min(100%, ${constrainedMax}px);`
      : 'max-width: 100%;',
  );

  const canCycleGallery = $derived(
    Boolean(state.prevGalleryHref && state.nextGalleryHref),
  );

  const activePhoto = $derived(
    state.activeSlug
      ? (state.photos.find((photo) => photo.slug === state.activeSlug) ?? null)
      : null,
  );

  const currentImage = $derived.by<GalleryImage | null>(() => {
    if (!activePhoto || !activePhoto.leadImage) return null;
    if (detailViewMode === 'contact_sheet') {
      return activePhoto.leadImage;
    }
    if (!state.activeImageId) return activePhoto.leadImage;
    return (
      activePhoto.additionalImages.find(
        (image) => image.id === state.activeImageId,
      ) ?? activePhoto.leadImage
    );
  });

  const activeIndex = $derived.by(() => {
    if (!state.activeSlug) return -1;
    return state.photos.findIndex((photo) => photo.slug === state.activeSlug);
  });

  const wait = (ms: number) =>
    new Promise<void>((resolvePromise) => setTimeout(resolvePromise, ms));

  const hasText = (value: string | null | undefined) =>
    Boolean(value && value.trim().length > 0);

  const shouldShowBottomDockForPhoto = (photo: GalleryPhoto) => {
    if (detailViewMode !== 'classic') return false;
    if (photographInfoMode !== 'bottom_dock') return false;

    const showTitle = data.gallerySettings?.show_photo_info_title ?? true;
    const showDescription =
      data.gallerySettings?.show_photo_info_description ?? true;
    const showCaptureDate =
      data.gallerySettings?.show_photo_info_capture_date ?? false;
    const showDimensions =
      data.gallerySettings?.show_photo_info_dimensions ?? false;
    const showLicense =
      data.gallerySettings?.show_photo_info_license_text ?? false;

    const showAnyText =
      (showTitle && hasText(photo.title)) ||
      (showDescription && hasText(photo.description)) ||
      (showCaptureDate && hasText(photo.capture_date)) ||
      (showDimensions && hasText(photo.dimensions)) ||
      (showLicense && hasText(photo.license_text));

    const showAdditionalStrip =
      viewerController.supportsAdditionalImages &&
      photo.additionalImages.length > 0;

    return showAnyText || showAdditionalStrip;
  };

  const waitForBottomDockLayout = async (expectDock: boolean) => {
    if (!expectDock) return;

    await tick();

    for (let frame = 0; frame < 10; frame += 1) {
      if (detailBottomInsetPx > 0) return;
      await new Promise<void>((resolveAnimation) => {
        requestAnimationFrame(() => {
          resolveAnimation();
        });
      });
    }
  };

  const clampDensity = (value: number) =>
    Math.max(1, Math.min(data.maxDensity ?? 20, Math.round(value)));

  const defaultDensityForViewport = () => {
    const desktopDefault = clampDensity(
      data.desktopDensityDefault ?? data.density,
    );
    const mobileDefault = clampDensity(
      data.mobileDensityDefault ?? desktopDefault,
    );
    return isMobileViewport() ? mobileDefault : desktopDefault;
  };

  const applyScopeViewerDefaults = () => {
    galleryDensityStore.set(defaultDensityForViewport());
    state.pageSize = data.pageSize;
    layoutModeStore.set(data.layoutMode);
  };

  const gotoPhotoRoute = async (slug: string, imageId?: string | null) => {
    const resolvedImageId = imageId ?? null;
    state.skipNextRouteAnimation = true;
    state.expectedRouteKeyFromGoto = routeKeyFor(slug, resolvedImageId);
    await goto(
      resolve(
        router.withCurrentSearch(
          router.photoPath(slug, resolvedImageId),
        ) as `/${string}`,
      ),
      {
        noScroll: true,
        keepFocus: true,
      },
    );
  };

  const gotoGalleryRoute = async () => {
    state.skipNextRouteAnimation = true;
    state.expectedRouteKeyFromGoto = '';
    await goto(
      resolve(
        router.withCurrentSearch(
          router.galleryBasePath(),
          true,
        ) as `/${string}`,
      ),
      {
        noScroll: true,
        keepFocus: true,
      },
    );
  };

  const navigation = createGalleryNavigation({
    state,
    transitionQueue,
    canCycleGallery: () => canCycleGallery,
    localNeighborsFor: router.localNeighborsFor,
    parseSlugFromPhotoHref: router.parseSlugFromPhotoHref,
    slideToNeighbor: (slug, direction) =>
      viewerController.navigateNeighbor(slug, direction),
    gotoPhotoRoute,
  });

  const pagination = createGalleryPagination({
    state,
    getLayoutMode: () => layoutMode,
    buildFeedUrl: router.buildFeedUrl,
  });

  const applyRouteState = async (
    route: ActiveRoute | null,
    animate: boolean,
  ) => {
    if (!route) {
      state.isClosing = true;
      navigation.clearDirectionQueue();
      if (typeof document !== 'undefined') {
        document.body.style.overflow = '';
      }
      await viewerController.close(animate);
      setPhase('idle');
      state.prevGalleryHref = null;
      state.nextGalleryHref = null;
      return;
    }

    state.isClosing = false;
    if (typeof document !== 'undefined') {
      document.body.style.overflow = 'hidden';
    }
    setPhase('open');

    const switchingPhotos = Boolean(
      state.activeSlug && state.activeSlug !== route.photoSlug,
    );

    await viewerController.open(
      route.photoSlug,
      route.imageId,
      animate && !switchingPhotos,
    );

    state.activeSlug = route.photoSlug;
    state.activeImageId = route.imageId;
    state.prevGalleryHref = route.prevGalleryHref;
    state.nextGalleryHref = route.nextGalleryHref;
  };

  const onOpenPhoto = (event: MouseEvent, slug: string) => {
    event.preventDefault();
    if (state.entranceLocked) return;
    state.isClosing = false;

    void (async () => {
      await transitionQueue.enqueue(async () => {
        const photo = state.photos.find((item) => item.slug === slug) ?? null;
        if (!photo) return;

        const neighbors = router.localNeighborsFor(slug);
        state.prevGalleryHref = neighbors.prevGalleryHref;
        state.nextGalleryHref = neighbors.nextGalleryHref;

        if (reducedMotion()) {
          state.activeSlug = slug;
          state.activeImageId = null;
          if (typeof document !== 'undefined') {
            document.body.style.overflow = 'hidden';
          }
          await viewerController.open(slug, null, true);
          setPhase('open');
          return;
        }

        setPhase('fade-out-chrome');
        await wait(FADE_OUT_CHROME_MS);

        if (typeof document !== 'undefined') {
          document.body.style.overflow = 'hidden';
        }

        await new Promise<void>((resolveAnimation) => {
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              resolveAnimation();
            });
          });
        });

        if (detailViewMode === 'classic') {
          const expectsBottomDock = shouldShowBottomDockForPhoto(photo);
          setPhase('scale-and-mask');
          state.activeSlug = slug;
          state.activeImageId = null;
          await waitForBottomDockLayout(expectsBottomDock);
          await viewerController.open(slug, null, true, SCALE_MASK_MS);
          setPhase('open');
          return;
        }

        setPhase('scale-and-mask');
        state.activeSlug = slug;
        state.activeImageId = null;
        await viewerController.open(slug, null, true, SCALE_MASK_MS);
        setPhase('open');
      });

      await gotoPhotoRoute(slug);
    })();
  };

  const onRetargetPhoto = async (slug: string) => {
    if (!state.activeSlug || slug === state.activeSlug) return;
    state.isClosing = false;

    await transitionQueue.enqueue(async () => {
      const neighbors = router.localNeighborsFor(slug);
      state.prevGalleryHref = neighbors.prevGalleryHref;
      state.nextGalleryHref = neighbors.nextGalleryHref;
      await viewerController.retarget(slug);
    });

    await gotoPhotoRoute(slug);
  };

  const closeToGallery = (event?: MouseEvent | KeyboardEvent) => {
    event?.preventDefault();
    state.isClosing = true;
    navigation.clearDirectionQueue();

    void (async () => {
      await transitionQueue.enqueue(async () => {
        setPhase('closing-chrome');
        await viewerController.close(true);
        setPhase('idle');
      });

      if (typeof document !== 'undefined') {
        document.body.style.overflow = '';
      }

      await gotoGalleryRoute();
    })();
  };

  const onSelectAdditionalImage = (imageId: string) => {
    const activeSlug = state.activeSlug;
    if (!activeSlug) return;
    state.isClosing = false;

    void (async () => {
      await transitionQueue.enqueue(async () => {
        state.activeImageId = imageId;
        if (
          viewerController.supportsAdditionalImages &&
          viewerController.isReady
        ) {
          await viewerController.open(activeSlug, imageId, false, 260);
        }
      });

      await gotoPhotoRoute(activeSlug, imageId);
    })();
  };

  const onResizePromoted = () => {
    if (!state.activeSlug) return;

    void transitionQueue.enqueue(async () => {
      await viewerController.resize();
    });
  };

  const onBottomDockInsetChange = (nextInsetPx: number) => {
    const normalized = Math.max(0, Math.round(nextInsetPx));
    if (normalized === detailBottomInsetPx) return;
    detailBottomInsetPx = normalized;
    onResizePromoted();
  };

  const preloadImages = async () => {
    const toPreload = state.photos
      .filter((photo) => photo.leadImage)
      .map((photo) =>
        photoPublicUrl(
          photo.leadImage!.delivery_storage_path,
          GALLERY_DETAIL_SHARED_WIDTH,
        ),
      );

    if (toPreload.length === 0) {
      state.preloaderVisible = false;
      state.galleryRevealed = true;
      return;
    }

    state.totalImages = toPreload.length;
    state.imagesLoaded = 0;
    state.galleryRevealed = false;

    const loadTasks = toPreload.map((url) => {
      const img = new Image();
      let settled = false;
      let completedSynchronously = false;

      const promise = new Promise<void>((resolveImage) => {
        const finish = () => {
          if (settled) return;
          settled = true;
          state.imagesLoaded += 1;
          resolveImage();
        };

        img.onload = finish;
        img.onerror = finish;
        img.src = url;
        if (img.complete) {
          completedSynchronously = true;
          finish();
        }
      });

      return { promise, completedSynchronously };
    });

    const synchronouslyLoaded = loadTasks.reduce(
      (count, task) => count + (task.completedSynchronously ? 1 : 0),
      0,
    );

    if (synchronouslyLoaded === state.totalImages) {
      state.preloaderVisible = false;
      state.galleryRevealed = true;
      return;
    }

    state.preloaderVisible = true;

    await Promise.all(loadTasks.map((task) => task.promise));

    /* Signal the preloader to begin its exit animation immediately. */
    state.preloaderVisible = false;

    /* Wait for the exit animation to finish, then reveal the gallery. */
    await new Promise((resolveExit) =>
      setTimeout(resolveExit, preloaderExitMs),
    );
    await new Promise((resolveReveal) => setTimeout(resolveReveal, 80));
    state.galleryRevealed = true;
  };

  const shouldShowPreloader = $derived(
    !data.active && state.photos.length > 0 && !reducedMotion(),
  );

  const gridModel = $derived<GalleryGridModel>({
    photos: state.photos,
    layoutMode,
    colCount,
    gap: state.gap,
    uniformRatio,
    placeholderCount,
    isLoadingMore: state.isLoadingMore,
    galleryRevealed: state.galleryRevealed,
    reducedMotion: reducedMotion(),
    withCurrentSearch: router.withCurrentSearchResolved,
    photoPath: router.photoPath,
    onOpenPhoto,
    bindGridRoot: viewerController.bindGridRoot,
    registerTile: viewerController.registerTile,
    hasThumbCrop: tileAnimator.hasThumbCrop,
    thumbCropStyle: tileAnimator.thumbCropStyle,
    tileAspectRatio: tileAnimator.tileAspectRatio,
    hasMore: state.hasMore,
    loadError: state.loadError,
    detailOpen: Boolean(state.activeSlug),
    onLoadMore: pagination.loadNextPage,
    sectionMaxWidthStyle,
    coverageRows: layout.coverageRows,
    coverageCols: layout.coverageCols,
    coverageAspect: layout.coverageAspect,
    coveragePlaceholderCount: layout.coveragePlaceholderCount,
    bindCoverageSection: layout.bindCoverageSection,
    rowsResult: layout.rowsResult,
    columnsResult: layout.columnsResult,
    showThumbnailZoomHover:
      data.gallerySettings?.show_thumbnail_zoom_hover ?? true,
    thumbnailEntrancePreset,
    entranceBatchKey: state.entranceBatchKey,
    entranceLocked: state.entranceLocked,
    entranceFx,
    onResolveEntranceOrder,
  });

  onMount(() => {
    state.mounted = true;
    if (state.activeSlug && typeof document !== 'undefined') {
      document.body.style.overflow = 'hidden';
    }

    initializedScopeSlug = routeScopeSlug;
    applyScopeViewerDefaults();
  });

  $effect(() => {
    if (typeof document === 'undefined') return;

    const root = document.documentElement;
    if (disableChromeBlurForSafariContactSheet) {
      root.setAttribute('data-contact-sheet-safari-transition', '1');
    } else {
      root.removeAttribute('data-contact-sheet-safari-transition');
    }

    return () => {
      root.removeAttribute('data-contact-sheet-safari-transition');
    };
  });

  $effect(() => {
    if (!state.mounted) return;
    if (routeScopeSlug === initializedScopeSlug) return;
    initializedScopeSlug = routeScopeSlug;
    applyScopeViewerDefaults();
  });

  $effect(() => {
    if (typeof window === 'undefined' || !state.mounted) return;
    const media = window.matchMedia('(max-width: 767px)');
    const onChange = () => {
      galleryDensityStore.set(defaultDensityForViewport());
    };
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  });

  $effect(() => {
    if (!state.mounted) return;

    const key = [routeScopeSlug, data.q || '\0'].join('|');
    if (!shouldShowPreloader) {
      if (state.photos.length > 0) {
        state.galleryRevealed = true;
        state.preloaderVisible = false;
        state.preloadKey = key;
      }
      return;
    }

    if (key === state.preloadKey) return;
    state.preloadKey = key;
    void preloadImages();
  });

  $effect(() => {
    if (!state.mounted) return;
    if (!state.entranceLocked) {
      clearEntranceLock();
      return;
    }
    if (!state.galleryRevealed || !state.entranceOrderReady) return;

    if (reducedMotion() || state.entranceOrderCount <= 0) {
      clearEntranceLock();
      state.entranceLocked = false;
      state.entranceSequenceComplete = true;
      return;
    }

    clearEntranceLock();

    const batchKey = state.entranceBatchKey;
    const unlockAfterMs =
      thumbnailEntranceRuntime.durationMs +
      Math.max(state.entranceOrderCount - 1, 0) *
        thumbnailEntranceRuntime.staggerMs +
      24;

    entranceUnlockTimer = setTimeout(() => {
      if (batchKey !== state.entranceBatchKey) return;
      state.entranceLocked = false;
      state.entranceSequenceComplete = true;
      entranceUnlockTimer = null;
    }, unlockAfterMs);

    return () => {
      clearEntranceLock();
    };
  });

  $effect(() => {
    if (!state.mounted) return;
    if (state.contactSheetEntranceFxDisabled) return;
    if (detailViewMode !== 'contact_sheet') return;
    if (!state.galleryRevealed) return;
    if (!state.entranceOrderReady) return;
    if (!state.entranceSequenceComplete && !reducedMotion()) return;

    state.contactSheetEntranceFxDisabled = true;
  });

  $effect(() => {
    if (!state.mounted) return;

    const nextQuerySignature = [routeScopeSlug, data.q, data.page].join('|');

    if (nextQuerySignature !== state.querySignature) {
      state.querySignature = nextQuerySignature;
      state.query = data.q;
      state.photos = data.photos;
      state.currentPage = data.page;
      state.hasMore = data.hasMore;
      state.loadError = null;
      startEntranceBatch(state.photos);
    } else {
      const existing = new Set(state.photos.map((photo) => photo.id));
      const nextPhotos = data.photos.filter(
        (photo: GalleryPhoto) => !existing.has(photo.id),
      );
      if (nextPhotos.length > 0) {
        state.photos = [...state.photos, ...nextPhotos];
      }

      if (data.page > state.currentPage) {
        state.currentPage = data.page;
      }

      if (state.hasMore !== data.hasMore) {
        state.hasMore = data.hasMore;
      }
    }

    const nextRouteKey = routeKeyFromActive(data.active);
    if (nextRouteKey === state.routeKey) return;

    if (state.expectedRouteKeyFromGoto !== null) {
      const match = matchesExpectedRouteKey(
        state.expectedRouteKeyFromGoto,
        nextRouteKey,
      );
      if (match) {
        state.expectedRouteKeyFromGoto = null;
        state.routeKey = nextRouteKey;
        state.hasHydratedRoute = true;
        return;
      }
    }

    const animate = state.hasHydratedRoute && !state.skipNextRouteAnimation;
    state.skipNextRouteAnimation = false;
    state.routeKey = nextRouteKey;
    state.hasHydratedRoute = true;

    transitionQueue.deferRouteApply(async () => {
      await applyRouteState(data.active, animate);
    });
  });

  $effect(() => {
    void layoutMode;
    void colCount;
    void state.gap;
    void state.photos.length;
    void detailBottomInsetPx;

    if (detailViewMode !== 'classic') return;
    if (!state.mounted || !state.activeSlug || !viewerController.isReady)
      return;

    void transitionQueue.enqueue(async () => {
      await viewerController.resize();
    });
  });

  onDestroy(() => {
    clearEntranceLock();
    if (typeof document !== 'undefined') {
      document.body.style.overflow = '';
    }
    classicViewer.release();
    contactSheetViewer.release();
  });
</script>

<GalleryPreloader
  visible={state.preloaderVisible}
  enabled={shouldShowPreloader}
  imagesLoaded={state.imagesLoaded}
  totalImages={state.totalImages}
  fadeMs={PRELOADER_FADE_MS}
  preset={normalizePreloaderPreset(data.gallerySettings?.preloader_preset)}
/>

<GalleryGrid model={gridModel} />

{#if activePhoto && currentImage}
  <GalleryDetailViewer
    {activePhoto}
    {currentImage}
    promoted={viewerController.isReady}
    {detailViewMode}
    activePosition={activeIndex >= 0 ? activeIndex + 1 : 0}
    totalPhotos={state.photos.length}
    supportsAdditionalImages={viewerController.supportsAdditionalImages}
    {transitionPhase}
    {overlayChromeHidden}
    {photographInfoMode}
    showPhotoInfoTitle={data.gallerySettings?.show_photo_info_title ?? true}
    showPhotoInfoDescription={data.gallerySettings
      ?.show_photo_info_description ?? true}
    showPhotoInfoCaptureDate={data.gallerySettings
      ?.show_photo_info_capture_date ?? false}
    showPhotoInfoDimensions={data.gallerySettings?.show_photo_info_dimensions ??
      false}
    showPhotoInfoLicenseText={data.gallerySettings
      ?.show_photo_info_license_text ?? false}
    {isTransitioning}
    {canCycleGallery}
    navButtonPreset={normalizeNavButtonPreset(
      data.gallerySettings?.nav_button_preset,
    )}
    prevGalleryHref={state.prevGalleryHref}
    nextGalleryHref={state.nextGalleryHref}
    withCurrentSearch={router.withCurrentSearch}
    galleryBasePath={router.galleryBasePath()}
    galleryName={data.galleryScope?.name ??
      data.galleryScope?.slug ??
      'Gallery'}
    photoPath={router.photoPath}
    onClose={closeToGallery}
    onNavigateNeighbor={navigation.onNeighborNavigate}
    {onSelectAdditionalImage}
    {onResizePromoted}
    {onBottomDockInsetChange}
    {portal}
    scaleMaskMs={SCALE_MASK_MS}
    closingChromeMs={CLOSING_CHROME_MS}
  />
{/if}
