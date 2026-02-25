import { error } from '@sveltejs/kit';
import { asPositiveInt, loadGalleryPage, loadGalleryPhotoNeighbors, normalizePageSize } from '$lib/server/gallery';
import type { LayoutServerLoad } from './$types';

type GalleryLayoutMode = 'uniform' | 'masonry';
type GalleryWidthMode = 'full' | 'constrained';

type ActivePhotoRoute = {
  photoSlug: string;
  imageId: string | null;
  prevGalleryHref: string | null;
  nextGalleryHref: string | null;
};

const photoRoutePattern = /^\/photo\/([^/]+)(?:\/([^/]+))?$/;

const asLayoutMode = (value: string | null, fallback: GalleryLayoutMode): GalleryLayoutMode => {
  return value === 'uniform' || value === 'masonry' ? value : fallback;
};

const asWidthMode = (value: string | null, fallback: GalleryWidthMode): GalleryWidthMode => {
  return value === 'full' || value === 'constrained' ? value : fallback;
};

const readActivePhotoRoute = (pathname: string): Pick<ActivePhotoRoute, 'photoSlug' | 'imageId'> | null => {
  const match = pathname.match(photoRoutePattern);
  if (!match) return null;

  const [, slug, imageId] = match;
  return {
    photoSlug: decodeURIComponent(slug),
    imageId: imageId ? decodeURIComponent(imageId) : null
  };
};

export const load: LayoutServerLoad = async ({ locals, url }) => {
  const { data: settings } = await locals.supabase
    .from('site_settings')
    .select('grid_desktop_default, grid_desktop_max, max_content_width_px, gallery_layout_mode, uniform_thumb_ratio')
    .eq('singleton_id', 1)
    .maybeSingle();

  const defaultDensity = settings?.grid_desktop_default ?? 6;
  const maxDensity = settings?.grid_desktop_max ?? 20;
  const startPage = asPositiveInt(url.searchParams.get('page'), 1);
  const pageSize = normalizePageSize(asPositiveInt(url.searchParams.get('pageSize'), 60));
  const density = Math.max(1, Math.min(maxDensity, asPositiveInt(url.searchParams.get('density'), defaultDensity)));
  const q = url.searchParams.get('q')?.trim() ?? '';
  const layoutMode = asLayoutMode(url.searchParams.get('layout'), settings?.gallery_layout_mode ?? 'uniform');
  const widthMode = asWidthMode(url.searchParams.get('width'), settings?.max_content_width_px ? 'constrained' : 'full');

  const activeRoute = readActivePhotoRoute(url.pathname);

  let page = startPage;
  let hasMore = false;
  const photos: Awaited<ReturnType<typeof loadGalleryPage>>['photos'] = [];

  while (true) {
    const payload = await loadGalleryPage(locals, { page, pageSize, q });
    hasMore = payload.hasMore;

    const seen = new Set(photos.map((photo) => photo.id));
    photos.push(...payload.photos.filter((photo) => !seen.has(photo.id)));

    const foundActive = activeRoute ? photos.some((photo) => photo.slug === activeRoute.photoSlug) : true;
    if (foundActive || !hasMore) {
      break;
    }

    page += 1;
  }

  const baseParams = new URLSearchParams(url.searchParams);
  baseParams.delete('page');

  let active: ActivePhotoRoute | null = null;
  if (activeRoute) {
    const activePhoto = photos.find((photo) => photo.slug === activeRoute.photoSlug);
    if (!activePhoto || !activePhoto.leadImage) {
      throw error(404, 'Photo not found');
    }

    if (activeRoute.imageId) {
      const hasAdditional = activePhoto.additionalImages.some((image) => image.id === activeRoute.imageId);
      if (!hasAdditional) {
        throw error(404, 'Image not found for this photo');
      }
    }

    const neighbors = await loadGalleryPhotoNeighbors(locals, activePhoto.id);
    active = {
      photoSlug: activeRoute.photoSlug,
      imageId: activeRoute.imageId,
      prevGalleryHref: neighbors.prevSlug ? `/photo/${neighbors.prevSlug}` : null,
      nextGalleryHref: neighbors.nextSlug ? `/photo/${neighbors.nextSlug}` : null
    };
  }

  return {
    photos,
    hasMore,
    page,
    pageSize,
    density,
    q,
    layoutMode,
    widthMode,
    maxContentWidthPx: settings?.max_content_width_px ?? null,
    uniformThumbRatio: Number(settings?.uniform_thumb_ratio ?? 1),
    maxDensity,
    baseQueryString: baseParams.toString(),
    active
  };
};
