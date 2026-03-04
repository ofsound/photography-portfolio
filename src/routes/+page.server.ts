import { photoPublicUrl } from '$lib/utils/storage-url';
import {
  DEFAULT_SLIDE_DURATION_MS,
  DEFAULT_TRANSITION_DURATION_MS,
  SLIDE_DURATION_MIN_MS,
  SLIDE_DURATION_MAX_MS,
  TRANSITION_DURATION_MIN_MS,
  TRANSITION_DURATION_MAX_MS,
  clampInt,
} from '$lib/server/slideshow-constants';
import { throwLoaderError } from '$lib/server/load-error';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
  const [slidesQuery, settingsQuery] = await Promise.all([
    locals.supabase
      .from('homepage_slides')
      .select(
        'id, position, photo_images:photo_image_id(delivery_storage_path, alt_text)',
      )
      .eq('is_active', true)
      .order('position', { ascending: true }),
    locals.supabase
      .from('site_settings')
      .select('homepage_slide_duration_ms, homepage_transition_duration_ms')
      .eq('singleton_id', 1)
      .maybeSingle(),
  ]);

  if (settingsQuery.error) {
    throwLoaderError(
      { route: '/', operation: 'load homepage settings' },
      settingsQuery.error,
    );
  }

  const slideDurationMs = clampInt(
    settingsQuery.data?.homepage_slide_duration_ms ?? DEFAULT_SLIDE_DURATION_MS,
    SLIDE_DURATION_MIN_MS,
    SLIDE_DURATION_MAX_MS,
  );
  const transitionDurationMs = Math.min(
    slideDurationMs,
    clampInt(
      settingsQuery.data?.homepage_transition_duration_ms ??
        DEFAULT_TRANSITION_DURATION_MS,
      TRANSITION_DURATION_MIN_MS,
      TRANSITION_DURATION_MAX_MS,
    ),
  );

  if (slidesQuery.error) {
    throwLoaderError(
      { route: '/', operation: 'load homepage slides' },
      slidesQuery.error,
    );
  }

  const slides = (slidesQuery.data ?? [])
    .map((row) => {
      const image = Array.isArray(row.photo_images)
        ? row.photo_images[0]
        : row.photo_images;
      if (!image?.delivery_storage_path) {
        return null;
      }

      return {
        id: row.id,
        imagePath: photoPublicUrl(image.delivery_storage_path, 2200),
        altText: image.alt_text ?? 'Homepage slide',
      };
    })
    .filter(
      (slide): slide is { id: string; imagePath: string; altText: string } =>
        slide !== null,
    );

  return { slides, slideDurationMs, transitionDurationMs };
};
