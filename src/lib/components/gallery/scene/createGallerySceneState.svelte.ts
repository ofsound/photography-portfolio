import type { GalleryPhoto } from '$lib/types/content';
import type { ViewerData } from './gallery-scene.types';

export const routeKeyFor = (photoSlug: string, imageId: string | null) =>
  `${photoSlug}:${imageId ?? ''}`;

export const routeKeyFromActive = (active: ViewerData['active']) =>
  active ? routeKeyFor(active.photoSlug, active.imageId) : '';

export const createGallerySceneState = (data: ViewerData) => {
  const state = $state({
    gap: data.gap,
    widthMode: data.widthMode,
    query: data.q,
    pageSize: data.pageSize,
    photos: data.photos as GalleryPhoto[],
    currentPage: data.page,
    hasMore: data.hasMore,
    loadError: null as string | null,
    isLoadingMore: false,

    activeSlug: data.active?.photoSlug ?? null,
    activeImageId: data.active?.imageId ?? null,
    prevGalleryHref: data.active?.prevGalleryHref ?? null,
    nextGalleryHref: data.active?.nextGalleryHref ?? null,

    routeKey: routeKeyFromActive(data.active),
    querySignature: '',
    mounted: false,
    hasHydratedRoute: Boolean(data.active),
    skipNextRouteAnimation: false,
    expectedRouteKeyFromGoto: null as string | null,
    isClosing: false,

    coverageAvailW: 0,
    coverageAvailH: 0,

    imagesLoaded: 0,
    totalImages: 0,
    preloaderVisible: false,
    galleryRevealed: false,
    preloadKey: '',
    entranceBatchKey: 0,
    entranceOrderReady: false,
    entranceOrderCount: 0,
    entranceLocked: false,
  });
  return state;
};

export type GallerySceneState = ReturnType<typeof createGallerySceneState>;
