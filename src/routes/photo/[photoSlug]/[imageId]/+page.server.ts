import { error } from '@sveltejs/kit';
import { loadPhotoBySlug } from '$lib/server/photos';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, params }) => {
  const photo = await loadPhotoBySlug(locals, params.photoSlug);

  const leadImage = photo.photo_images.find((image) => image.kind === 'lead') ?? photo.photo_images[0];
  const currentImage = photo.photo_images.find((image) => image.id === params.imageId && image.kind === 'additional');

  if (!leadImage || !currentImage) {
    throw error(404, 'Image not found for this photo');
  }

  return {
    photo: {
      ...photo,
      leadImage,
      currentImage,
      additionalImages: photo.photo_images.filter((image) => image.kind === 'additional')
    }
  };
};
