import { error } from '@sveltejs/kit';
import type { Database } from '$lib/types/database';
import { isUuid } from '$lib/server/admin/photos/shared';

const PHOTO_SELECT =
  'id, slug, title, capture_date, description, dimensions, license_text, og_title, og_description, og_image_path, status, deleted_at, updated_at';
const IMAGE_SELECT =
  'id, photo_id, kind, position, source_storage_path, delivery_storage_path, source_mime_type, source_bytes, alt_text, dimensions, thumb_crop_x, thumb_crop_y, thumb_crop_zoom, created_at';

type PhotoRow = Database['public']['Tables']['photos']['Row'];
type CategoryRow = Database['public']['Tables']['categories']['Row'];
type TagRow = Database['public']['Tables']['tags']['Row'];
type PhotoCategoryRow = Database['public']['Tables']['photo_categories']['Row'];
type PhotoTagRow = Database['public']['Tables']['photo_tags']['Row'];
type PhotoImageRow = Database['public']['Tables']['photo_images']['Row'];

export const loadSinglePhotoEditorData = async (locals: App.Locals, identifier: string) => {
  let photo: PhotoRow | null =
    (isUuid(identifier)
      ? ((await locals.supabase.from('photos').select(PHOTO_SELECT).eq('id', identifier).maybeSingle()).data as PhotoRow | null)
      : null) ?? null;

  if (!photo) {
    const bySlug = await locals.supabase.from('photos').select(PHOTO_SELECT).eq('slug', identifier).maybeSingle();
    if (bySlug.error) throw error(500, bySlug.error.message);
    photo = bySlug.data as PhotoRow | null;
  }

  if (!photo) {
    throw error(404, 'Photo not found');
  }

  const [categoriesResult, tagsResult, categoryLinksResult, tagLinksResult, imagesResult] = await Promise.all([
    locals.supabase.from('categories').select('id, name, slug, is_active').order('name', { ascending: true }),
    locals.supabase.from('tags').select('id, name, slug, is_active').order('name', { ascending: true }),
    locals.supabase.from('photo_categories').select('category_id').eq('photo_id', photo.id),
    locals.supabase.from('photo_tags').select('tag_id').eq('photo_id', photo.id),
    locals.supabase.from('photo_images').select(IMAGE_SELECT).eq('photo_id', photo.id).order('position', { ascending: true })
  ]);

  if (categoriesResult.error) throw error(500, categoriesResult.error.message);
  if (tagsResult.error) throw error(500, tagsResult.error.message);
  if (categoryLinksResult.error) throw error(500, categoryLinksResult.error.message);
  if (tagLinksResult.error) throw error(500, tagLinksResult.error.message);
  if (imagesResult.error) throw error(500, imagesResult.error.message);

  const categories = (categoriesResult.data ?? []) as CategoryRow[];
  const tags = (tagsResult.data ?? []) as TagRow[];
  const categoryLinks = (categoryLinksResult.data ?? []) as Pick<PhotoCategoryRow, 'category_id'>[];
  const tagLinks = (tagLinksResult.data ?? []) as Pick<PhotoTagRow, 'tag_id'>[];
  const images = (imagesResult.data ?? []) as PhotoImageRow[];

  const hasReady = images.some((img: PhotoImageRow) => Boolean(img.delivery_storage_path));
  const hasPending = images.some((img: PhotoImageRow) => !img.delivery_storage_path);
  const photoConversionState: 'no-images' | 'pending' | 'ready' | 'mixed' = !images.length
    ? 'no-images'
    : hasReady && hasPending
      ? 'mixed'
      : hasPending
        ? 'pending'
        : 'ready';

  return {
    photo,
    categories,
    tags,
    selectedCategoryIds: categoryLinks.map((row: Pick<PhotoCategoryRow, 'category_id'>) => row.category_id),
    selectedTagIds: tagLinks.map((row: Pick<PhotoTagRow, 'tag_id'>) => row.tag_id),
    images,
    photoConversionState,
    pendingConversionCount: images.filter((img: PhotoImageRow) => !img.delivery_storage_path).length
  };
};
