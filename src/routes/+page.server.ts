import { photoPublicUrl } from '$lib/utils/storage-url';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
  const { data, error } = await locals.supabase
    .from('homepage_slides')
    .select('id, position, photo_images:photo_image_id(delivery_storage_path, alt_text)')
    .eq('is_active', true)
    .order('position', { ascending: true });

  if (error) {
    return { slides: [] };
  }

  const slides = (data ?? [])
    .map((row) => {
      const image = Array.isArray(row.photo_images) ? row.photo_images[0] : row.photo_images;
      if (!image?.delivery_storage_path) {
        return null;
      }

      return {
        id: row.id,
        imagePath: photoPublicUrl(image.delivery_storage_path, 2200),
        altText: image.alt_text ?? 'Homepage slide'
      };
    })
    .filter((slide): slide is { id: string; imagePath: string; altText: string } => slide !== null);

  return { slides };
};
