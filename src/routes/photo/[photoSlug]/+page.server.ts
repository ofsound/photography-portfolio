import { loadPhotoBySlug } from '$lib/server/photos';
import { loadGalleryPhotoNeighbors } from '$lib/server/gallery';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, params }) => {
  const photo = await loadPhotoBySlug(locals, params.photoSlug);
  const leadImage = photo.photo_images.find((image) => image.kind === 'lead') ?? photo.photo_images[0];
  const additionalImages = photo.photo_images.filter((image) => image.kind === 'additional' && image.id !== leadImage?.id);
  const neighbors = await loadGalleryPhotoNeighbors(locals, photo.id);

  if (!leadImage) {
    return {
      photo: null
    };
  }

  return {
    photo: {
      ...photo,
      leadImage,
      currentImage: leadImage,
      additionalImages,
      prevGalleryHref: neighbors.prevSlug ? `/photo/${neighbors.prevSlug}` : null,
      nextGalleryHref: neighbors.nextSlug ? `/photo/${neighbors.nextSlug}` : null
    }
  };
};
