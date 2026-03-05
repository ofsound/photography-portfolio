const encode = (segment: string) => encodeURIComponent(segment);

export const buildGalleryPath = (gallerySlug: string) =>
  `/${encode(gallerySlug)}`;

export const buildGalleryFeedPath = (gallerySlug: string) =>
  `${buildGalleryPath(gallerySlug)}/feed`;

export const buildGalleryPhotoPath = (
  gallerySlug: string,
  photoSlug: string,
  imageId?: string | null,
) =>
  imageId
    ? `${buildGalleryPath(gallerySlug)}/photo/${encode(photoSlug)}/${encode(imageId)}`
    : `${buildGalleryPath(gallerySlug)}/photo/${encode(photoSlug)}`;

export const isGalleryDetailPath = (pathname: string) =>
  /^\/[^/]+\/photo\/[^/]+(?:\/[^/]+)?$/.test(pathname);
