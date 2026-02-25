import { error } from '@sveltejs/kit';
import { loadPhotoBySlug } from '$lib/server/photos';
import { loadGalleryPhotoNeighbors } from '$lib/server/gallery';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, params }) => {
  const photo = await loadPhotoBySlug(locals, params.photoSlug);

  const leadImage = photo.photo_images.find((image) => image.kind === 'lead') ?? photo.photo_images[0];
  const currentImage = photo.photo_images.find((image) => image.id === params.imageId && image.kind === 'additional');
  const additionalImages = photo.photo_images.filter((image) => image.kind === 'additional' && image.id !== leadImage?.id);
  const neighbors = await loadGalleryPhotoNeighbors(locals, photo.id);

  if (!leadImage || !currentImage) {
    throw error(404, 'Image not found for this photo');
  }

  return {
    photo: {
      ...photo,
      leadImage,
      currentImage,
      additionalImages,
      prevGalleryHref: neighbors.prevSlug ? `/photo/${neighbors.prevSlug}` : null,
      nextGalleryHref: neighbors.nextSlug ? `/photo/${neighbors.nextSlug}` : null
    }
  };
};
