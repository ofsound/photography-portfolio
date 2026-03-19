import {
  buildGalleryPath,
  buildGalleryPhotoPath,
} from '$lib/utils/gallery-routes';

const encodePathSegment = (segment: string): string => {
  try {
    return encodeURIComponent(decodeURIComponent(segment));
  } catch {
    return encodeURIComponent(segment);
  }
};

export function resolveAdminEditorPath(
  pathname: string,
  gallerySlugs: Set<string>,
): string | null {
  if (
    pathname === '/admin' ||
    pathname.startsWith('/admin/') ||
    pathname.startsWith('/auth/')
  ) {
    return null;
  }
  if (pathname === '/auth' || pathname === '/search') return null;

  const segments = pathname.split('/').filter(Boolean);
  if (segments.length === 0) return '/admin/homepage';

  const rootSlug = segments[0];
  const rootSlugEncoded = encodePathSegment(rootSlug);

  if (segments.length === 1) {
    if (gallerySlugs.has(rootSlug)) {
      return `/admin/${rootSlugEncoded}/details`;
    }
    return `/admin/pages/edit/${rootSlugEncoded}`;
  }

  if (segments[1] === 'photo' && segments[2] && gallerySlugs.has(rootSlug)) {
    return `/admin/${rootSlugEncoded}/photos/edit/${encodePathSegment(segments[2])}`;
  }

  if (segments[1] === 'feed' && gallerySlugs.has(rootSlug)) {
    return `/admin/${rootSlugEncoded}/details`;
  }

  return null;
}

type PageData = Record<string, unknown> | null;

export function computeAdminPublicPath(
  pathname: string,
  pageData: PageData,
): string | null {
  const segments = pathname.split('/').filter(Boolean);
  if (segments[0] !== 'admin') return null;

  if (segments.length === 2 && segments[1] === 'homepage') {
    return '/';
  }

  const pageRecord = (pageData?.page as { slug?: string } | null) ?? null;
  const galleryRecord = (pageData?.gallery as { slug?: string } | null) ?? null;
  const photoRecord = (pageData?.photo as { slug?: string } | null) ?? null;

  if (
    segments.length === 4 &&
    segments[1] === 'pages' &&
    segments[2] === 'edit' &&
    pageRecord?.slug
  ) {
    return `/${encodePathSegment(pageRecord.slug)}`;
  }

  if (
    segments.length === 3 &&
    segments[2] === 'details' &&
    galleryRecord?.slug
  ) {
    return buildGalleryPath(galleryRecord.slug);
  }

  if (
    segments.length === 3 &&
    segments[2] === 'photos' &&
    galleryRecord?.slug
  ) {
    return buildGalleryPath(galleryRecord.slug);
  }

  if (
    segments.length === 5 &&
    segments[2] === 'photos' &&
    segments[3] === 'edit' &&
    galleryRecord?.slug &&
    photoRecord?.slug
  ) {
    return buildGalleryPhotoPath(galleryRecord.slug, photoRecord.slug);
  }

  return null;
}
