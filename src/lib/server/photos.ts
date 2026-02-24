import { error } from '@sveltejs/kit';

export type LoadedPhoto = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  capture_date: string | null;
  width_px: number | null;
  height_px: number | null;
  photo_images: Array<{
    id: string;
    kind: 'lead' | 'additional';
    position: number;
    delivery_storage_path: string;
    alt_text: string | null;
    width_px: number | null;
    height_px: number | null;
  }>;
};

export const loadPhotoBySlug = async (locals: App.Locals, slug: string): Promise<LoadedPhoto> => {
  const { data, error: photoError } = await locals.supabase
    .from('photos')
    .select(
      'id, slug, title, description, capture_date, width_px, height_px, photo_images(id, kind, position, delivery_storage_path, alt_text, width_px, height_px)'
    )
    .eq('slug', slug)
    .eq('status', 'published')
    .is('deleted_at', null)
    .maybeSingle();

  if (photoError || !data) {
    throw error(404, 'Photo not found');
  }

  return {
    ...data,
    photo_images: [...(data.photo_images ?? [])].sort((a, b) => a.position - b.position)
  } as LoadedPhoto;
};
