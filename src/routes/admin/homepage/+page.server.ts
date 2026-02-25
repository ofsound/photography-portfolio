import { fail, type Actions } from '@sveltejs/kit';
import { asString, parseUuidList } from '$lib/server/admin-helpers';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
  const [{ data: slidesRaw }, { data: imagesRaw }, pendingQuery] = await Promise.all([
    locals.supabase
      .from('homepage_slides')
      .select('id, photo_image_id, position, is_active, photo_images:photo_image_id(id, kind, delivery_storage_path, photo_id, photos:photo_id(title, slug))')
      .order('position', { ascending: true }),
    locals.supabase
      .from('photo_images')
      .select('id, kind, position, delivery_storage_path, photo_id, photos:photo_id(title, slug)')
      .eq('is_active', true)
      .not('delivery_storage_path', 'is', null)
      .order('created_at', { ascending: false })
      .limit(300),
    locals.supabase
      .from('photo_images')
      .select('id', { count: 'exact', head: true })
      .eq('is_active', true)
      .is('delivery_storage_path', null)
  ]);

  const slides = (slidesRaw ?? []).map((row: { id: string; photo_image_id: string; position: number; is_active: boolean; photo_images?: unknown }) => {
    const image = Array.isArray(row.photo_images) ? row.photo_images[0] : row.photo_images;
    const photo = image && typeof image === 'object' && 'photos' in image
      ? (Array.isArray((image as { photos: unknown }).photos) ? (image as { photos: Array<{ title?: string; slug?: string }> }).photos[0] : (image as { photos: { title?: string; slug?: string } }).photos)
      : undefined;

    const img = image as { kind?: string; delivery_storage_path?: string } | undefined;
    return {
      id: row.id,
      photo_image_id: row.photo_image_id,
      position: row.position,
      is_active: row.is_active,
      kind: img?.kind ?? 'additional',
      delivery_storage_path: img?.delivery_storage_path ?? null,
      photo_title: photo?.title ?? 'Untitled',
      photo_slug: photo?.slug ?? null
    };
  });

  const images = (imagesRaw ?? []).map((row: { id: string; kind: string; position: number; delivery_storage_path: string | null; photos?: { title?: string; slug?: string } | Array<{ title?: string; slug?: string }> }) => {
    const photo = Array.isArray(row.photos) ? row.photos[0] : row.photos;
    return {
      id: row.id,
      kind: row.kind,
      position: row.position,
      delivery_storage_path: row.delivery_storage_path,
      photo_title: photo?.title ?? 'Untitled',
      photo_slug: photo?.slug ?? null
    };
  });

  return {
    slides,
    images,
    pendingConversionCount: pendingQuery.count ?? 0
  };
};

export const actions: Actions = {
  save: async ({ locals, request }) => {
    const form = await request.formData();
    const imageIds = parseUuidList(asString(form.get('ordered_image_ids')));

    const slides = imageIds.map((photoImageId, index) => ({
      photo_image_id: photoImageId,
      position: index,
      is_active: true
    }));

    const { error } = await locals.supabase.rpc('save_homepage_slides', {
      p_slides: slides
    });

    if (error) return fail(400, { message: error.message });

    return { success: true, message: 'Homepage slideshow updated.' };
  }
};
