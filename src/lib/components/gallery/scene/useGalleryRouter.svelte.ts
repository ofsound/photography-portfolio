import { resolve } from '$app/paths';
import { SvelteURLSearchParams } from 'svelte/reactivity';
import type { GalleryPhoto } from '$lib/types/content';
import {
  buildGalleryFeedPath,
  buildGalleryPath,
  buildGalleryPhotoPath,
} from '$lib/utils/gallery-routes';
import { routeKeyFor } from './createGallerySceneState.svelte';

type GalleryRouterOptions = {
  getRouteScopeSlug: () => string;
  getQuery: () => string;
  getCurrentPage: () => number;
  getPageSize: () => number;
  getPhotos: () => GalleryPhoto[];
};

const parseSlugFromPhotoHref = (href: string | null) => {
  if (!href) return null;
  const match = href.match(/^\/[^/]+\/photo\/([^/]+)/);
  if (!match) return null;
  return decodeURIComponent(match[1]);
};

const matchesExpectedRouteKey = (expected: string, next: string) =>
  next === expected || (expected.endsWith(':') && next.startsWith(expected));

export const createGalleryRouter = ({
  getRouteScopeSlug,
  getQuery,
  getCurrentPage,
  getPageSize,
  getPhotos,
}: GalleryRouterOptions) => {
  const galleryBasePath = () => buildGalleryPath(getRouteScopeSlug());

  const photoPath = (photoSlug: string, imageId?: string | null) =>
    buildGalleryPhotoPath(getRouteScopeSlug(), photoSlug, imageId);

  const buildUrlParams = (includePage = false) => {
    const params = new SvelteURLSearchParams();
    const query = getQuery().trim();
    if (query) params.set('q', query);
    if (includePage && getCurrentPage() > 1) {
      params.set('page', String(getCurrentPage()));
    }
    return params;
  };

  const buildFeedParams = () => {
    const params = new SvelteURLSearchParams();
    params.set('page', String(getCurrentPage() + 1));
    params.set('pageSize', String(getPageSize()));
    const query = getQuery().trim();
    if (query) params.set('q', query);
    return params;
  };

  const buildFeedUrl = () =>
    `${buildGalleryFeedPath(getRouteScopeSlug())}?${buildFeedParams().toString()}`;

  const withCurrentSearch = (href: string, includePage = false) => {
    const search = buildUrlParams(includePage).toString();
    return search ? `${href}?${search}` : href;
  };

  const withCurrentSearchResolved = (href: string, includePage = false) =>
    resolve(withCurrentSearch(href, includePage) as `/${string}`);

  const localNeighborsFor = (slug: string) => {
    const photos = getPhotos();
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
      prevGalleryHref: prev?.slug ? photoPath(prev.slug) : null,
      nextGalleryHref: next?.slug ? photoPath(next.slug) : null,
    };
  };

  return {
    galleryBasePath,
    photoPath,
    buildFeedUrl,
    withCurrentSearch,
    withCurrentSearchResolved,
    parseSlugFromPhotoHref,
    localNeighborsFor,
  };
};

export { matchesExpectedRouteKey, routeKeyFor };
