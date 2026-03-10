import { fail, type Actions } from '@sveltejs/kit';

import {
  asOptionalNumber,
  asString,
  parseUuidList,
} from '$lib/server/admin-helpers';
import { pagePayloadFromForm } from '$lib/server/admin/page-form';
import { sanitizeCmsCssRaw, sanitizeCmsHtml } from '$lib/server/cms-sanitize';
import {
  compileCmsTailwindCss,
  CmsTailwindCompileError,
} from '$lib/server/cms-tailwind';
import { failForm } from '$lib/server/form-errors';
import { throwLoaderError } from '$lib/server/load-error';
import {
  DEFAULT_SLIDE_DURATION_MS,
  DEFAULT_TRANSITION_DURATION_MS,
  SLIDE_DURATION_MIN_MS,
  SLIDE_DURATION_MAX_MS,
  TRANSITION_DURATION_MIN_MS,
  TRANSITION_DURATION_MAX_MS,
  clampInt,
} from '$lib/server/slideshow-constants';
import {
  parseSveditPageDocument,
  SVEDIT_PAGE_SCHEMA_VERSION,
} from '$lib/svedit/page-document';
import type { Database } from '$lib/types/database';
import type { PageServerLoad } from './$types';

const PAGE_SELECT =
  'id, slug, title, kind, html_content, css_module, tailwind_css, editor_mode, svedit_doc, svedit_schema_version, hero_vertical_alignment_pct, seo_title, seo_description, og_title, og_description, og_image_path, visibility_status, nav_order, deleted_at, updated_at';
const HOME_PAGE_SLUG = 'home';
const DEFAULT_HOME_PAGE_TITLE = 'Homepage Hero';
const HERO_VERTICAL_ALIGNMENT_MIN_PCT = 0;
const HERO_VERTICAL_ALIGNMENT_MAX_PCT = 100;
const HERO_VERTICAL_ALIGNMENT_DEFAULT_PCT = 50;

type HomePageRow = Database['public']['Tables']['pages']['Row'];

type HomepageSection = 'slides' | 'hero';

const normalizeSection = (value: string | null): HomepageSection =>
  value === 'hero' ? 'hero' : 'slides';

const clampHeroVerticalAlignmentPct = (value: number | null) => {
  if (value == null || !Number.isFinite(value))
    return HERO_VERTICAL_ALIGNMENT_DEFAULT_PCT;
  const normalized = Math.round(value);
  return Math.min(
    HERO_VERTICAL_ALIGNMENT_MAX_PCT,
    Math.max(HERO_VERTICAL_ALIGNMENT_MIN_PCT, normalized),
  );
};

const ensureHomePageRecord = async (locals: App.Locals) => {
  const homeQuery = await locals.supabase
    .from('pages')
    .select(PAGE_SELECT)
    .eq('kind', 'home')
    .is('deleted_at', null)
    .maybeSingle();

  if (homeQuery.error) {
    throwLoaderError(
      { route: '/admin/homepage', operation: 'load home page record' },
      homeQuery.error,
    );
  }

  if (homeQuery.data) {
    return homeQuery.data as HomePageRow;
  }

  const insertQuery = await locals.supabase
    .from('pages')
    .insert({
      slug: HOME_PAGE_SLUG,
      title: DEFAULT_HOME_PAGE_TITLE,
      kind: 'home',
      html_content: '',
      css_module: '',
      tailwind_css: '',
      editor_mode: 'code',
      svedit_doc: null,
      svedit_schema_version: SVEDIT_PAGE_SCHEMA_VERSION,
      hero_vertical_alignment_pct: HERO_VERTICAL_ALIGNMENT_DEFAULT_PCT,
      seo_title: null,
      seo_description: null,
      og_title: null,
      og_description: null,
      og_image_path: null,
      visibility_status: 'draft',
      nav_order: 0,
      deleted_at: null,
    })
    .select(PAGE_SELECT)
    .single();

  if (insertQuery.error) {
    const retryQuery = await locals.supabase
      .from('pages')
      .select(PAGE_SELECT)
      .eq('kind', 'home')
      .is('deleted_at', null)
      .maybeSingle();

    if (!retryQuery.error && retryQuery.data) {
      return retryQuery.data as HomePageRow;
    }

    throwLoaderError(
      { route: '/admin/homepage', operation: 'auto-create home page record' },
      insertQuery.error,
    );
  }

  return insertQuery.data as HomePageRow;
};

export const load: PageServerLoad = async ({ locals, url }) => {
  const section = normalizeSection(url.searchParams.get('section'));

  const [slidesQuery, imagesQuery, pendingQuery, settingsQuery, homeQuery] =
    await Promise.all([
      locals.supabase
        .from('homepage_slides')
        .select(
          'id, photo_image_id, position, is_active, photo_images:photo_image_id(id, kind, delivery_storage_path, photo_id, photos:photo_id(title, slug))',
        )
        .order('position', { ascending: true }),
      locals.supabase
        .from('photo_images')
        .select(
          'id, kind, position, delivery_storage_path, photo_id, photos:photo_id(title, slug, status, deleted_at, galleries:gallery_id(visibility_status))',
        )
        .eq('is_active', true)
        .not('delivery_storage_path', 'is', null)
        .order('created_at', { ascending: false })
        .limit(500),
      locals.supabase
        .from('photo_images')
        .select('id', { count: 'exact', head: true })
        .eq('is_active', true)
        .is('delivery_storage_path', null),
      locals.supabase
        .from('site_settings')
        .select('homepage_slide_duration_ms, homepage_transition_duration_ms')
        .eq('singleton_id', 1)
        .maybeSingle(),
      locals.supabase
        .from('pages')
        .select(PAGE_SELECT)
        .eq('kind', 'home')
        .is('deleted_at', null)
        .maybeSingle(),
    ]);

  if (slidesQuery.error) {
    throwLoaderError(
      { route: '/admin/homepage', operation: 'load homepage slides' },
      slidesQuery.error,
    );
  }

  if (imagesQuery.error) {
    throwLoaderError(
      { route: '/admin/homepage', operation: 'load image options' },
      imagesQuery.error,
    );
  }

  if (pendingQuery.error) {
    throwLoaderError(
      { route: '/admin/homepage', operation: 'load pending conversion count' },
      pendingQuery.error,
    );
  }

  if (settingsQuery.error) {
    throwLoaderError(
      { route: '/admin/homepage', operation: 'load slideshow timing settings' },
      settingsQuery.error,
    );
  }

  if (homeQuery.error) {
    throwLoaderError(
      { route: '/admin/homepage', operation: 'load home page record' },
      homeQuery.error,
    );
  }

  const slidesRaw = slidesQuery.data;
  const imagesRaw = imagesQuery.data;

  const slides = (slidesRaw ?? []).map(
    (row: {
      id: string;
      photo_image_id: string;
      position: number;
      is_active: boolean;
      photo_images?: unknown;
    }) => {
      const image = Array.isArray(row.photo_images)
        ? row.photo_images[0]
        : row.photo_images;
      const photo =
        image && typeof image === 'object' && 'photos' in image
          ? Array.isArray((image as { photos: unknown }).photos)
            ? (image as { photos: Array<{ title?: string; slug?: string }> })
                .photos[0]
            : (image as { photos: { title?: string; slug?: string } }).photos
          : undefined;

      const img = image as
        | { kind?: string; delivery_storage_path?: string }
        | undefined;
      return {
        id: row.id,
        photo_image_id: row.photo_image_id,
        position: row.position,
        is_active: row.is_active,
        kind: img?.kind ?? 'additional',
        delivery_storage_path: img?.delivery_storage_path ?? null,
        photo_title: photo?.title ?? 'Untitled',
        photo_slug: photo?.slug ?? null,
      };
    },
  );

  const images = (imagesRaw ?? [])
    .filter(
      (row: {
        photos?:
          | {
              status?: string;
              deleted_at?: string | null;
              galleries?:
                | { visibility_status?: string }
                | Array<{ visibility_status?: string }>;
            }
          | Array<{
              status?: string;
              deleted_at?: string | null;
              galleries?:
                | { visibility_status?: string }
                | Array<{ visibility_status?: string }>;
            }>;
      }) => {
        const photo = Array.isArray(row.photos) ? row.photos[0] : row.photos;
        if (!photo) return false;
        if (photo.status !== 'published' || photo.deleted_at != null)
          return false;
        const gallery = Array.isArray(photo.galleries)
          ? photo.galleries[0]
          : photo.galleries;
        if (gallery?.visibility_status === 'archived') return false;
        return true;
      },
    )
    .map(
      (row: {
        id: string;
        kind: string;
        position: number;
        delivery_storage_path: string | null;
        photos?:
          | { title?: string; slug?: string }
          | Array<{ title?: string; slug?: string }>;
      }) => {
        const photo = Array.isArray(row.photos) ? row.photos[0] : row.photos;
        return {
          id: row.id,
          kind: row.kind,
          position: row.position,
          delivery_storage_path: row.delivery_storage_path,
          photo_title: photo?.title ?? 'Untitled',
          photo_slug: photo?.slug ?? null,
        };
      },
    );

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

  let homePage = (homeQuery.data as HomePageRow | null) ?? null;

  if (!homePage && section === 'hero') {
    homePage = await ensureHomePageRecord(locals);
  }

  let revisions: Array<
    Database['public']['Tables']['content_revisions']['Row']
  > = [];

  if (homePage) {
    const revisionsQuery = await locals.supabase
      .from('content_revisions')
      .select(
        'id, entity_type, entity_pk, version_no, changed_at, changed_by, snapshot, reason',
      )
      .eq('entity_type', 'page')
      .eq('entity_pk', String(homePage.id))
      .order('changed_at', { ascending: false })
      .limit(100);

    if (revisionsQuery.error) {
      throwLoaderError(
        { route: '/admin/homepage', operation: 'load home page revisions' },
        revisionsQuery.error,
      );
    }

    revisions = revisionsQuery.data ?? [];
  }

  return {
    section,
    slides,
    images,
    pendingConversionCount: pendingQuery.count ?? 0,
    slideDurationMs,
    transitionDurationMs,
    homePage,
    revisions,
  };
};

export const actions: Actions = {
  save: async ({ locals, request }) => {
    const form = await request.formData();
    const imageIds = parseUuidList(asString(form.get('ordered_image_ids')));

    const slides = imageIds.map((photoImageId, index) => ({
      photo_image_id: photoImageId,
      position: index,
      is_active: true,
    }));

    const slideDurationMs = clampInt(
      asOptionalNumber(form.get('slide_duration_ms')) ??
        DEFAULT_SLIDE_DURATION_MS,
      SLIDE_DURATION_MIN_MS,
      SLIDE_DURATION_MAX_MS,
    );
    const transitionDurationMs = Math.min(
      slideDurationMs,
      clampInt(
        asOptionalNumber(form.get('transition_duration_ms')) ??
          DEFAULT_TRANSITION_DURATION_MS,
        TRANSITION_DURATION_MIN_MS,
        TRANSITION_DURATION_MAX_MS,
      ),
    );

    const [slidesResult, settingsResult] = await Promise.all([
      locals.supabase.rpc('save_homepage_slides', {
        p_slides: slides,
      }),
      locals.supabase
        .from('site_settings')
        .update({
          homepage_slide_duration_ms: slideDurationMs,
          homepage_transition_duration_ms: transitionDurationMs,
        })
        .eq('singleton_id', 1),
    ]);

    if (slidesResult.error)
      return fail(400, { message: slidesResult.error.message });
    if (settingsResult.error)
      return fail(400, { message: settingsResult.error.message });

    return { success: true, message: 'Homepage slideshow updated.' };
  },

  saveHero: async ({ locals, request }) => {
    const form = await request.formData();
    const heroVerticalAlignmentPct = clampHeroVerticalAlignmentPct(
      asOptionalNumber(form.get('hero_vertical_alignment_pct')),
    );
    const result = await pagePayloadFromForm(form);

    if (!result.ok) {
      return failForm(result.message, {
        fieldErrors: result.fieldErrors,
        values: {
          ...(result.values ?? {}),
          hero_vertical_alignment_pct: String(heroVerticalAlignmentPct),
        },
      });
    }

    const visibilityStatus =
      asString(form.get('visibility_status')).trim() === 'public'
        ? 'public'
        : 'draft';

    let homePageId = asString(form.get('id')).trim();
    if (!homePageId) {
      const homePage = await ensureHomePageRecord(locals);
      homePageId = homePage.id;
    }

    const updateResult = await locals.supabase
      .from('pages')
      .update({
        ...result.payload,
        kind: 'home',
        slug: HOME_PAGE_SLUG,
        visibility_status: visibilityStatus,
        hero_vertical_alignment_pct: heroVerticalAlignmentPct,
        bg_image_id: null,
        nav_order: 0,
        deleted_at: null,
      })
      .eq('id', homePageId)
      .eq('kind', 'home');

    if (updateResult.error) {
      return fail(400, { message: updateResult.error.message });
    }

    return { success: true, message: 'Homepage hero updated.' };
  },

  rollbackHero: async ({ locals, request }) => {
    const form = await request.formData();

    const id = asString(form.get('id')).trim();
    if (!id) {
      return fail(400, { message: 'Missing home page id.' });
    }

    const revisionId = Number(asString(form.get('revision_id')));
    if (!Number.isFinite(revisionId)) {
      return fail(400, { message: 'Invalid revision id.' });
    }

    const revisionQuery = await locals.supabase
      .from('content_revisions')
      .select('id, entity_type, entity_pk, snapshot')
      .eq('id', revisionId)
      .eq('entity_type', 'page')
      .eq('entity_pk', id)
      .maybeSingle();

    if (revisionQuery.error || !revisionQuery.data) {
      return fail(404, { message: 'Revision not found.' });
    }

    const snapshot = revisionQuery.data.snapshot as Record<string, unknown>;
    const editorMode = snapshot.editor_mode === 'svedit' ? 'svedit' : 'code';

    const sveditDocResult =
      editorMode === 'svedit'
        ? parseSveditPageDocument(snapshot.svedit_doc ?? null)
        : null;

    if (sveditDocResult && !sveditDocResult.ok) {
      return fail(400, {
        message: `Cannot roll back invalid Svedit revision: ${sveditDocResult.message}`,
      });
    }

    const sanitizedHtml =
      editorMode === 'code'
        ? sanitizeCmsHtml(String(snapshot.html_content ?? ''))
        : '';

    let tailwindCss = '';
    if (editorMode === 'code') {
      try {
        tailwindCss = await compileCmsTailwindCss(sanitizedHtml);
      } catch (error: unknown) {
        const message =
          error instanceof CmsTailwindCompileError
            ? error.message
            : 'Failed to compile Tailwind CSS for this rollback.';
        return fail(400, { message });
      }
    }

    const visibilityStatus =
      String(snapshot.visibility_status ?? '').trim() === 'public'
        ? 'public'
        : 'draft';
    const heroVerticalAlignmentPct = clampHeroVerticalAlignmentPct(
      Number(snapshot.hero_vertical_alignment_pct ?? 50),
    );
    const title =
      String(snapshot.title ?? '').trim() || DEFAULT_HOME_PAGE_TITLE;

    const updateResult = await locals.supabase
      .from('pages')
      .update({
        slug: HOME_PAGE_SLUG,
        title,
        kind: 'home',
        html_content: sanitizedHtml,
        css_module:
          editorMode === 'code'
            ? sanitizeCmsCssRaw(String(snapshot.css_module ?? ''))
            : '',
        tailwind_css: tailwindCss,
        editor_mode: editorMode,
        svedit_doc: sveditDocResult?.ok ? sveditDocResult.document : null,
        svedit_schema_version: SVEDIT_PAGE_SCHEMA_VERSION,
        seo_title: snapshot.seo_title ? String(snapshot.seo_title) : null,
        seo_description: snapshot.seo_description
          ? String(snapshot.seo_description)
          : null,
        og_title: snapshot.og_title ? String(snapshot.og_title) : null,
        og_description: snapshot.og_description
          ? String(snapshot.og_description)
          : null,
        og_image_path: snapshot.og_image_path
          ? String(snapshot.og_image_path)
          : null,
        visibility_status: visibilityStatus,
        hero_vertical_alignment_pct: heroVerticalAlignmentPct,
        bg_image_id: null,
        nav_order: 0,
        deleted_at: null,
      })
      .eq('id', id)
      .eq('kind', 'home');

    if (updateResult.error) {
      return fail(400, { message: updateResult.error.message });
    }

    return { success: true, message: 'Homepage hero rolled back.' };
  },
};
