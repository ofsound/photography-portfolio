import { error, redirect } from '@sveltejs/kit';
import {
  asPositiveInt,
  loadAllGalleryPhotos,
  loadGalleryPage,
  loadGalleryPhotoNeighbors,
  loadGallerySettings,
  normalizePageSize,
  resolveGalleryScope,
  resolvePhotoRoute,
} from '$lib/server/gallery';
import { loadPageBySlug } from '$lib/server/pages';
import { RESERVED_SLUGS } from '$lib/server/reserved-slugs';
import { buildGalleryPhotoPath } from '$lib/utils/gallery-routes';
import type { LayoutServerLoad } from './$types';

type GalleryLayoutMode =
  | 'uniform'
  | 'masonry'
  | 'coverage'
  | 'rows'
  | 'columns';
type GalleryWidthMode = 'full' | 'constrained';

type ActivePhotoRoute = {
  photoSlug: string;
  imageId: string | null;
  prevGalleryHref: string | null;
  nextGalleryHref: string | null;
};

type GalleryScope = Extract<
  Awaited<ReturnType<typeof resolveGalleryScope>>,
  { kind: 'scope' }
>['scope'];

const scopedPhotoRoutePattern = /^\/[^/]+\/photo\/([^/]+)(?:\/([^/]+))?$/;

const readActivePhotoRoute = (
  pathname: string,
): Pick<ActivePhotoRoute, 'photoSlug' | 'imageId'> | null => {
  const match = pathname.match(scopedPhotoRoutePattern);
  if (!match) return null;

  const [, slug, imageId] = match;
  return {
    photoSlug: decodeURIComponent(slug),
    imageId: imageId ? decodeURIComponent(imageId) : null,
  };
};

const replaceRootSlug = (pathname: string, toSlug: string) => {
  const segments = pathname.split('/').filter(Boolean);
  if (segments.length === 0) {
    return `/${encodeURIComponent(toSlug)}`;
  }
  segments[0] = encodeURIComponent(toSlug);
  return `/${segments.join('/')}`;
};

const isPhotoOrFeedPath = (pathname: string) =>
  /^\/[^/]+\/(?:photo\/[^/]+(?:\/[^/]+)?|feed)$/.test(pathname);

const buildBaseQueryString = (q: string) => {
  const baseParams = new URLSearchParams();
  if (q) baseParams.set('q', q);
  return baseParams.toString();
};

const allScope: GalleryScope = {
  kind: 'all',
  slug: 'all',
  name: 'All',
};

const loadGalleryModeData = async ({
  locals,
  url,
  scope,
}: {
  locals: App.Locals;
  url: URL;
  scope: GalleryScope;
}) => {
  const settings = await loadGallerySettings(locals, scope);

  const defaultDensity = settings.grid_desktop_default ?? 6;
  const maxDensity = 10;
  const startPage = asPositiveInt(url.searchParams.get('page'), 1);
  const pageSize = normalizePageSize(60);
  const density = defaultDensity;
  const gap = settings.gallery_gap_px ?? 8;
  const q = url.searchParams.get('q')?.trim() ?? '';
  const layoutMode = (settings.gallery_layout_mode ??
    'uniform') as GalleryLayoutMode;
  const widthMode = (
    settings.max_content_width_px ? 'constrained' : 'full'
  ) as GalleryWidthMode;
  const routePhoto = readActivePhotoRoute(url.pathname);

  const resolvedRoute = routePhoto
    ? await resolvePhotoRoute(
        locals,
        scope,
        routePhoto.photoSlug,
        routePhoto.imageId,
      )
    : null;

  if (resolvedRoute?.kind === 'redirect') {
    const nextUrl = new URL(resolvedRoute.location, url);
    nextUrl.search = url.search;
    throw redirect(301, `${nextUrl.pathname}${nextUrl.search}`);
  }

  if (routePhoto && resolvedRoute?.kind !== 'photo') {
    throw error(404, 'Photo not found');
  }

  const activePhotoId =
    resolvedRoute?.kind === 'photo' ? resolvedRoute.photo.id : null;

  let page = startPage;
  let hasMore: boolean;
  const photos: Awaited<ReturnType<typeof loadGalleryPage>>['photos'] = [];

  if (
    layoutMode === 'coverage' ||
    layoutMode === 'rows' ||
    layoutMode === 'columns'
  ) {
    const allPayload = await loadAllGalleryPhotos(locals, scope, q);
    photos.push(...allPayload.photos);
    hasMore = false;
    page = 1;
  } else {
    while (true) {
      const payload = await loadGalleryPage(locals, {
        scope,
        page,
        pageSize,
        q,
      });
      hasMore = payload.hasMore;

      const seenIds = new Set(photos.map((photo) => photo.id));
      photos.push(...payload.photos.filter((photo) => !seenIds.has(photo.id)));

      const foundActive = activePhotoId
        ? photos.some((photo) => photo.id === activePhotoId)
        : true;
      if (foundActive || !hasMore) {
        break;
      }

      page += 1;
    }
  }

  let active: ActivePhotoRoute | null = null;

  if (routePhoto && activePhotoId) {
    const activePhoto =
      photos.find((photo) => photo.id === activePhotoId) ?? null;
    if (!activePhoto || !activePhoto.leadImage) {
      throw error(404, 'Photo not found');
    }

    if (routePhoto.imageId) {
      const hasAdditional = activePhoto.additionalImages.some(
        (image) => image.id === routePhoto.imageId,
      );
      if (!hasAdditional) {
        throw error(404, 'Image not found for this photo');
      }
    }

    const neighbors = await loadGalleryPhotoNeighbors(
      locals,
      scope,
      activePhoto.id,
    );
    active = {
      photoSlug: activePhoto.slug,
      imageId: routePhoto.imageId,
      prevGalleryHref: neighbors.prevSlug
        ? buildGalleryPhotoPath(scope.slug, neighbors.prevSlug)
        : null,
      nextGalleryHref: neighbors.nextSlug
        ? buildGalleryPhotoPath(scope.slug, neighbors.nextSlug)
        : null,
    };
  }

  return {
    viewerMode: 'gallery' as const,
    customPage: null,
    galleryScope: scope,
    photos,
    hasMore,
    page,
    pageSize,
    density,
    gap,
    q,
    layoutMode,
    widthMode,
    maxContentWidthPx: settings.max_content_width_px ?? null,
    uniformThumbRatio: Number(settings.uniform_thumb_ratio ?? 1),
    maxDensity,
    baseQueryString: buildBaseQueryString(q),
    active,
    gallerySettings: {
      show_photograph_info: settings.show_photograph_info ?? true,
      show_thumbnail_zoom_hover: settings.show_thumbnail_zoom_hover ?? true,
      show_search_bar: settings.show_search_bar ?? true,
    },
  };
};

export const load: LayoutServerLoad = async ({ locals, params, url }) => {
  const rootSlug = params.rootSlug;

  if (rootSlug === 'all') {
    const routePhoto = readActivePhotoRoute(url.pathname);

    if (!routePhoto) {
      throw redirect(301, `/search${url.search}`);
    }

    const resolvedRoute = await resolvePhotoRoute(
      locals,
      allScope,
      routePhoto.photoSlug,
      routePhoto.imageId,
    );

    if (resolvedRoute.kind === 'photo') {
      throw redirect(
        301,
        `${buildGalleryPhotoPath(
          resolvedRoute.photo.gallerySlug,
          resolvedRoute.photo.slug,
          routePhoto.imageId,
        )}${url.search}`,
      );
    }

    if (resolvedRoute.kind === 'redirect') {
      const redirectedUrl = new URL(resolvedRoute.location, url);
      const redirectedPhoto = readActivePhotoRoute(redirectedUrl.pathname);

      if (redirectedPhoto) {
        const canonicalPhoto = await resolvePhotoRoute(
          locals,
          allScope,
          redirectedPhoto.photoSlug,
          redirectedPhoto.imageId,
        );

        if (canonicalPhoto.kind === 'photo') {
          throw redirect(
            301,
            `${buildGalleryPhotoPath(
              canonicalPhoto.photo.gallerySlug,
              canonicalPhoto.photo.slug,
              redirectedPhoto.imageId,
            )}${url.search}`,
          );
        }
      }
    }

    throw redirect(301, `/search${url.search}`);
  }

  const scopeResolution = await resolveGalleryScope(locals, rootSlug);

  if (scopeResolution.kind === 'redirect') {
    const pathname = replaceRootSlug(url.pathname, scopeResolution.toSlug);
    throw redirect(301, `${pathname}${url.search}`);
  }

  if (scopeResolution.kind === 'scope') {
    return loadGalleryModeData({
      locals,
      scope: scopeResolution.scope,
      url,
    });
  }

  if (isPhotoOrFeedPath(url.pathname)) {
    throw error(404, 'Not found');
  }

  if (RESERVED_SLUGS.has(rootSlug)) {
    throw error(404, 'Not found');
  }

  const customPage = await loadPageBySlug(locals, rootSlug);
  if (!customPage || customPage.kind !== 'custom') {
    throw error(404, 'Not found');
  }

  return {
    viewerMode: 'page' as const,
    galleryScope: null,
    customPage,
    photos: [],
    hasMore: false,
    page: 1,
    pageSize: 60,
    density: 6,
    gap: 8,
    q: '',
    layoutMode: 'uniform' as const,
    widthMode: 'full' as const,
    maxContentWidthPx: null,
    uniformThumbRatio: 1,
    maxDensity: 10,
    baseQueryString: '',
    active: null,
    gallerySettings: {
      show_photograph_info: true,
      show_thumbnail_zoom_hover: true,
      show_search_bar: false,
    },
  };
};
