<script lang="ts">
  import { goto } from '$app/navigation';
  import { resolve } from '$app/paths';
  import { onDestroy, onMount } from 'svelte';
  import GalleryDetailViewer from './scene/GalleryDetailViewer.svelte';
  import GalleryGrid from './scene/GalleryGrid.svelte';
  import GalleryPreloader from './scene/GalleryPreloader.svelte';
  import { createGalleryTransitionQueue } from './scene/GalleryTransitionQueue.svelte';
  import { getGalleryTransitionContext } from '$lib/context/gallery-transition';
  import {
    getGalleryPrefs,
    galleryDensityStore,
    layoutModeStore,
  } from '$lib/stores/gallery-prefs.svelte';
  import { parseDimensions } from '$lib/utils/parse-dimensions';
  import {
    GALLERY_DETAIL_SHARED_WIDTH,
    photoPublicUrl,
  } from '$lib/utils/storage-url';
  import {
    createGallerySceneState,
    routeKeyFromActive,
  } from './scene/createGallerySceneState.svelte';
  import { createGalleryLayout } from './scene/useGalleryLayout.svelte';
  import { createGalleryNavigation } from './scene/useGalleryNavigation.svelte';
  import { createGalleryPagination } from './scene/useGalleryPagination.svelte';
  import {
    createGalleryRouter,
    matchesExpectedRouteKey,
    routeKeyFor,
  } from './scene/useGalleryRouter.svelte';
  import { createGalleryTileAnimator } from './scene/useGalleryTileAnimator.svelte';

  import type { GalleryPhoto } from '$lib/types/content';
  import type { GalleryGridModel } from './scene/gallery-grid-model';
  import type {
    ActiveRoute,
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

  const colCount = $derived(
    Math.max(
      1,
      Math.min(data.maxDensity ?? 20, Number(galleryDensityStore.value) || 6),
    ),
  );

  const placeholderCount = $derived(Math.max(colCount, 6));

  const uniformRatio = $derived(
    Math.max(0.2, Number(data.uniformThumbRatio ?? 1)),
  );

  const naturalAspectRatio = (photo: GalleryPhoto) => {
    const parsed = parseDimensions(photo.leadImage?.dimensions);
    if (parsed) {
      return Math.max(0.2, parsed.width / parsed.height);
    }
    return uniformRatio;
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
    if (!state.activeImageId) return activePhoto.leadImage;
    return (
      activePhoto.additionalImages.find(
        (image) => image.id === state.activeImageId,
      ) ?? activePhoto.leadImage
    );
  });

  const wait = (ms: number) =>
    new Promise<void>((resolvePromise) => setTimeout(resolvePromise, ms));

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
    slideToNeighbor: tileAnimator.slideToNeighbor,
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
      await tileAnimator.collapsePromotedTile(animate);
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

    await tileAnimator.ensurePromotedTile(
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
          await tileAnimator.ensurePromotedTile(slug, null, true);
          setPhase('open');
          return;
        }

        setPhase('fade-out-chrome');
        await wait(FADE_OUT_CHROME_MS);

        setPhase('scale-and-mask');
        state.activeSlug = slug;
        state.activeImageId = null;

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

        await tileAnimator.ensurePromotedTile(slug, null, true, SCALE_MASK_MS);
        setPhase('open');
      });

      await gotoPhotoRoute(slug);
    })();
  };

  const closeToGallery = (event?: MouseEvent | KeyboardEvent) => {
    event?.preventDefault();
    state.isClosing = true;
    navigation.clearDirectionQueue();

    void (async () => {
      await transitionQueue.enqueue(async () => {
        await tileAnimator.collapsePromotedTile(true);
      });

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
        if (tileAnimator.promoted) {
          await tileAnimator.ensurePromotedTile(
            activeSlug,
            imageId,
            false,
            260,
          );
        }
      });

      await gotoPhotoRoute(activeSlug, imageId);
    })();
  };

  const onResizePromoted = () => {
    if (!state.activeSlug || !tileAnimator.promoted) return;

    void transitionQueue.enqueue(async () => {
      await tileAnimator.resizePromotedNow();
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

    await new Promise((resolveFade) =>
      setTimeout(resolveFade, PRELOADER_FADE_MS),
    );
    state.preloaderVisible = false;

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
    registerTile: tileAnimator.registerTile,
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
  });

  onMount(() => {
    state.mounted = true;
    if (state.activeSlug && typeof document !== 'undefined') {
      document.body.style.overflow = 'hidden';
    }

    const prefs = getGalleryPrefs(data.maxDensity ?? 20);
    if (prefs) {
      galleryDensityStore.set(prefs.density);
      state.pageSize = prefs.pageSize;
      layoutModeStore.set(prefs.layoutMode ?? data.layoutMode);
    } else {
      layoutModeStore.set(data.layoutMode);
    }
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

    const nextQuerySignature = [routeScopeSlug, data.q, data.page].join('|');

    if (nextQuerySignature !== state.querySignature) {
      state.querySignature = nextQuerySignature;
      state.query = data.q;
      state.photos = data.photos;
      state.currentPage = data.page;
      state.hasMore = data.hasMore;
      state.loadError = null;
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

  onDestroy(() => {
    if (typeof document !== 'undefined') {
      document.body.style.overflow = '';
    }
    tileAnimator.releaseAnyPromoted();
  });
</script>

<GalleryPreloader
  visible={state.preloaderVisible}
  enabled={shouldShowPreloader}
  imagesLoaded={state.imagesLoaded}
  totalImages={state.totalImages}
  fadeMs={PRELOADER_FADE_MS}
/>

<GalleryGrid model={gridModel} />

{#if activePhoto && currentImage}
  <GalleryDetailViewer
    {activePhoto}
    {currentImage}
    promoted={Boolean(tileAnimator.promoted)}
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
    prevGalleryHref={state.prevGalleryHref}
    nextGalleryHref={state.nextGalleryHref}
    withCurrentSearch={router.withCurrentSearch}
    galleryBasePath={router.galleryBasePath()}
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
