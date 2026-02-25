import { fail, type Actions } from '@sveltejs/kit';
import { asOptionalNumber, asString, parseUuidList } from '$lib/server/admin-helpers';
import type { PageServerLoad } from './$types';

const DEFAULT_SLIDE_DURATION_MS = 4000;
const DEFAULT_TRANSITION_DURATION_MS = 2000;
const SLIDE_DURATION_MIN_MS = 1000;
const SLIDE_DURATION_MAX_MS = 30000;
const TRANSITION_DURATION_MIN_MS = 200;
const TRANSITION_DURATION_MAX_MS = 10000;

const clampInt = (value: number, min: number, max: number) => Math.min(max, Math.max(min, Math.round(value)));

export const load: PageServerLoad = async ({ locals }) => {
  const [{ data: slidesRaw }, { data: imagesRaw }, pendingQuery, settingsQuery] = await Promise.all([
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
      .is('delivery_storage_path', null),
    locals.supabase
      .from('site_settings')
      .select('homepage_slide_duration_ms, homepage_transition_duration_ms')
      .eq('singleton_id', 1)
      .maybeSingle()
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

  const slideDurationMs = clampInt(
    settingsQuery.data?.homepage_slide_duration_ms ?? DEFAULT_SLIDE_DURATION_MS,
    SLIDE_DURATION_MIN_MS,
    SLIDE_DURATION_MAX_MS
  );
  const transitionDurationMs = Math.min(
    slideDurationMs,
    clampInt(
      settingsQuery.data?.homepage_transition_duration_ms ?? DEFAULT_TRANSITION_DURATION_MS,
      TRANSITION_DURATION_MIN_MS,
      TRANSITION_DURATION_MAX_MS
    )
  );

  return {
    slides,
    images,
    pendingConversionCount: pendingQuery.count ?? 0,
    slideDurationMs,
    transitionDurationMs
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
  },
  saveTiming: async ({ locals, request }) => {
    const form = await request.formData();

    const slideDurationMs = clampInt(
      asOptionalNumber(form.get('slide_duration_ms')) ?? DEFAULT_SLIDE_DURATION_MS,
      SLIDE_DURATION_MIN_MS,
      SLIDE_DURATION_MAX_MS
    );
    const transitionDurationMs = Math.min(
      slideDurationMs,
      clampInt(
        asOptionalNumber(form.get('transition_duration_ms')) ?? DEFAULT_TRANSITION_DURATION_MS,
        TRANSITION_DURATION_MIN_MS,
        TRANSITION_DURATION_MAX_MS
      )
    );

    const { error } = await locals.supabase
      .from('site_settings')
      .update({
        homepage_slide_duration_ms: slideDurationMs,
        homepage_transition_duration_ms: transitionDurationMs
      })
      .eq('singleton_id', 1);

    if (error) return fail(400, { message: error.message });

    return { success: true, message: 'Homepage slideshow timing updated.' };
  }
};
