import { loadPhotoBySlug } from '$lib/server/photos';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, params }) => {
  const photo = await loadPhotoBySlug(locals, params.photoSlug);
  const leadImage = photo.photo_images.find((image) => image.kind === 'lead') ?? photo.photo_images[0];

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
      additionalImages: photo.photo_images.filter((image) => image.kind === 'additional')
    }
  };
};
