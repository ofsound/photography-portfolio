import { photoPublicUrl } from '$lib/utils/storage-url';
import type { PageServerLoad } from './$types';

const DEFAULT_SLIDE_DURATION_MS = 4000;
const DEFAULT_TRANSITION_DURATION_MS = 2000;
const SLIDE_DURATION_MIN_MS = 1000;
const SLIDE_DURATION_MAX_MS = 30000;
const TRANSITION_DURATION_MIN_MS = 200;
const TRANSITION_DURATION_MAX_MS = 10000;

const clampInt = (value: number, min: number, max: number) => Math.min(max, Math.max(min, Math.round(value)));

export const load: PageServerLoad = async ({ locals }) => {
  const [slidesQuery, settingsQuery] = await Promise.all([
    locals.supabase
      .from('homepage_slides')
      .select('id, position, photo_images:photo_image_id(delivery_storage_path, alt_text)')
      .eq('is_active', true)
      .order('position', { ascending: true }),
    locals.supabase
      .from('site_settings')
      .select('homepage_slide_duration_ms, homepage_transition_duration_ms')
      .eq('singleton_id', 1)
      .maybeSingle()
  ]);

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

  if (slidesQuery.error) {
    return { slides: [], slideDurationMs, transitionDurationMs };
  }

  const slides = (slidesQuery.data ?? [])
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

  return { slides, slideDurationMs, transitionDurationMs };
};
