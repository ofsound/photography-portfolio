import { fail, redirect, type Actions } from '@sveltejs/kit';

import { getCmsRole } from '$lib/server/admin-helpers';
import { throwLoaderError } from '$lib/server/load-error';
import { loadHomePage } from '$lib/server/pages';
import {
  DEFAULT_PAN_STRENGTH_PCT,
  DEFAULT_SLIDE_DURATION_MS,
  DEFAULT_TRANSITION_DURATION_MS,
  DEFAULT_ZOOM_STRENGTH_PCT,
  PAN_STRENGTH_MAX_PCT,
  PAN_STRENGTH_MIN_PCT,
  SLIDE_DURATION_MIN_MS,
  SLIDE_DURATION_MAX_MS,
  TRANSITION_DURATION_MIN_MS,
  TRANSITION_DURATION_MAX_MS,
  ZOOM_STRENGTH_MAX_PCT,
  ZOOM_STRENGTH_MIN_PCT,
  clampInt,
} from '$lib/server/slideshow-constants';
import {
  createDefaultSveditPageDocument,
  parseSveditPageDocument,
  SVEDIT_PAGE_SCHEMA_VERSION,
} from '$lib/svedit/page-document';
import { photoPublicUrl } from '$lib/utils/storage-url';
import type { PageServerLoad } from './$types';

const canEditPublicPages = async (locals: App.Locals) => {
  const role = await getCmsRole(locals);
  return role === 'admin' || role === 'editor';
};

export const load: PageServerLoad = async ({ locals, url }) => {
  const [slidesQuery, settingsQuery, homePageRaw, canEdit] = await Promise.all([
    locals.supabase
      .from('homepage_slides')
      .select(
        'id, position, photo_images:photo_image_id(delivery_storage_path, alt_text)',
      )
      .eq('is_active', true)
      .order('position', { ascending: true }),
    locals.supabase
      .from('site_settings')
      .select(
        'homepage_slide_duration_ms, homepage_transition_duration_ms, homepage_zoom_strength_pct, homepage_pan_strength_pct',
      )
      .eq('singleton_id', 1)
      .maybeSingle(),
    loadHomePage(locals),
    canEditPublicPages(locals),
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
  const zoomStrengthPct = clampInt(
    settingsQuery.data?.homepage_zoom_strength_pct ?? DEFAULT_ZOOM_STRENGTH_PCT,
    ZOOM_STRENGTH_MIN_PCT,
    ZOOM_STRENGTH_MAX_PCT,
  );
  const panStrengthPct = clampInt(
    settingsQuery.data?.homepage_pan_strength_pct ?? DEFAULT_PAN_STRENGTH_PCT,
    PAN_STRENGTH_MIN_PCT,
    PAN_STRENGTH_MAX_PCT,
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

  const heroPage =
    homePageRaw && homePageRaw.visibility_status === 'public'
      ? homePageRaw
      : null;

  return {
    slides,
    slideDurationMs,
    transitionDurationMs,
    zoomStrengthPct,
    panStrengthPct,
    heroPage,
    canEditPublicPages: canEdit,
    initialPublicEditMode:
      canEdit &&
      Boolean(heroPage) &&
      Boolean(heroPage?.editor_mode === 'svedit') &&
      Boolean(url.searchParams.get('edit') === '1'),
  };
};

export const actions: Actions = {
  save: async ({ locals, request }) => {
    const canEdit = await canEditPublicPages(locals);
    if (!canEdit) {
      return fail(403, { message: 'Editor access required.' });
    }

    const form = await request.formData();
    const rawSveditDoc = String(form.get('svedit_doc') ?? '').trim();

    const pageResult = await locals.supabase
      .from('pages')
      .select('id, editor_mode, visibility_status')
      .eq('kind', 'home')
      .is('deleted_at', null)
      .maybeSingle();

    if (pageResult.error) {
      return fail(500, { message: pageResult.error.message });
    }

    if (!pageResult.data || pageResult.data.visibility_status !== 'public') {
      return fail(404, { message: 'Homepage hero is not available.' });
    }

    if (pageResult.data.editor_mode !== 'svedit') {
      return fail(400, {
        message: 'Public edit mode is only available for Svedit pages.',
      });
    }

    const docResult = parseSveditPageDocument(
      rawSveditDoc || createDefaultSveditPageDocument(),
    );
    if (!docResult.ok) {
      return fail(400, { message: docResult.message });
    }

    const updateResult = await locals.supabase
      .from('pages')
      .update({
        svedit_doc: docResult.document,
        svedit_schema_version: SVEDIT_PAGE_SCHEMA_VERSION,
      })
      .eq('id', pageResult.data.id)
      .eq('kind', 'home');

    if (updateResult.error) {
      return fail(400, { message: updateResult.error.message });
    }

    const next = new URL(request.url);
    next.searchParams.set('edit', '1');

    throw redirect(303, `${next.pathname}${next.search}`);
  },
};
