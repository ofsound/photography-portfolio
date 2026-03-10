import { error, fail, redirect, type Actions } from '@sveltejs/kit';
import { asString } from '$lib/server/admin-helpers';
import {
  pagePayloadFromForm,
  type PageVisibilityStatus,
  validateCmsPageSlug,
} from '$lib/server/admin/page-form';
import { sanitizeCmsCssRaw, sanitizeCmsHtml } from '$lib/server/cms-sanitize';
import {
  compileCmsTailwindCss,
  CmsTailwindCompileError,
} from '$lib/server/cms-tailwind';
import { failForm } from '$lib/server/form-errors';
import {
  parseSveditPageDocument,
  SVEDIT_PAGE_SCHEMA_VERSION,
} from '$lib/svedit/page-document';
import { isGallerySlugTaken } from '$lib/server/root-slug';
import type { Database } from '$lib/types/database';
import type { HomepageImage } from '$lib/types/content';
import type { PageServerLoad } from './$types';

const PAGE_SELECT =
  'id, slug, title, kind, html_content, css_module, tailwind_css, editor_mode, svedit_doc, svedit_schema_version, seo_title, seo_description, og_title, og_description, og_image_path, bg_image_id, max_width_override_px, visibility_status, nav_order, deleted_at, updated_at';
const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
type PageRow = Database['public']['Tables']['pages']['Row'];

const toPositiveIntegerOrNull = (value: unknown) => {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) return null;
  return parsed;
};

const redirectToList = (message: string) => {
  throw redirect(
    303,
    `/admin/pages?message=${encodeURIComponent(message)}&success=1`,
  );
};

export const load: PageServerLoad = async ({ locals, params }) => {
  const identifier = params.identifier;
  let page: PageRow | null = null;

  if (UUID_REGEX.test(identifier)) {
    const byId = await locals.supabase
      .from('pages')
      .select(PAGE_SELECT)
      .eq('id', identifier)
      .neq('kind', 'home')
      .is('deleted_at', null)
      .maybeSingle();
    if (byId.error) throw error(500, byId.error.message);
    page = byId.data as PageRow | null;
  }

  if (!page) {
    const bySlug = await locals.supabase
      .from('pages')
      .select(PAGE_SELECT)
      .eq('slug', identifier)
      .neq('kind', 'home')
      .is('deleted_at', null)
      .maybeSingle();
    if (bySlug.error) throw error(500, bySlug.error.message);
    page = bySlug.data as PageRow | null;
  }

  if (!page) {
    throw error(404, 'Page not found');
  }

  const [revisionsQuery, imagesQuery] = await Promise.all([
    locals.supabase
      .from('content_revisions')
      .select(
        'id, entity_type, entity_pk, version_no, changed_at, changed_by, snapshot',
      )
      .eq('entity_type', 'page')
      .eq('entity_pk', String(page.id))
      .order('changed_at', { ascending: false })
      .limit(100),
    locals.supabase
      .from('photo_images')
      .select(
        'id, kind, position, delivery_storage_path, photo_id, photos:photo_id!inner(title, slug, status, deleted_at, galleries:gallery_id!inner(visibility_status))',
      )
      .eq('is_active', true)
      .eq('kind', 'lead')
      .not('delivery_storage_path', 'is', null)
      .eq('photos.status', 'published')
      .is('photos.deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(300),
  ]);

  if (revisionsQuery.error) throw error(500, revisionsQuery.error.message);
  if (imagesQuery.error) throw error(500, imagesQuery.error.message);

  const images = (imagesQuery.data ?? [])
    .map(
      (row: {
        id: string;
        kind: Database['public']['Enums']['asset_kind'];
        position: number;
        delivery_storage_path: string | null;
        photos?:
          | {
              title?: string;
              slug?: string;
              galleries?:
                | { visibility_status?: string }
                | Array<{ visibility_status?: string }>;
            }
          | Array<{
              title?: string;
              slug?: string;
              galleries?:
                | { visibility_status?: string }
                | Array<{ visibility_status?: string }>;
            }>;
      }) => {
        const photo = Array.isArray(row.photos) ? row.photos[0] : row.photos;
        const gallery = Array.isArray(photo?.galleries)
          ? photo?.galleries[0]
          : photo?.galleries;
        if (gallery?.visibility_status === 'archived') return null;

        return {
          id: row.id,
          kind: row.kind as HomepageImage['kind'],
          position: row.position,
          delivery_storage_path: row.delivery_storage_path,
          photo_title: photo?.title ?? 'Untitled',
          photo_slug: photo?.slug ?? null,
        } satisfies HomepageImage;
      },
    )
    .filter((image): image is HomepageImage => image != null);

  return {
    page,
    revisions: revisionsQuery.data ?? [],
    images,
  };
};

export const actions: Actions = {
  update: async ({ locals, request }) => {
    const form = await request.formData();
    const id = asString(form.get('id'));
    if (!id) return fail(400, { message: 'Missing page id.' });

    const result = await pagePayloadFromForm(form);
    if (!result.ok) {
      return failForm(result.message, {
        fieldErrors: result.fieldErrors,
        values: result.values,
      });
    }
    if (await isGallerySlugTaken(locals, result.payload.slug)) {
      return failForm('Slug conflicts with an existing gallery.', {
        fieldErrors: { slug: 'Slug conflicts with an existing gallery.' },
        values: {
          id,
          title: asString(form.get('title')).trim(),
          slug: asString(form.get('slug')).trim(),
          visibility_status: asString(form.get('visibility_status')).trim(),
          editor_mode: asString(form.get('editor_mode')).trim(),
          seo_title: asString(form.get('seo_title')).trim(),
          seo_description: asString(form.get('seo_description')).trim(),
          og_title: asString(form.get('og_title')).trim(),
          og_description: asString(form.get('og_description')).trim(),
          og_image_path: asString(form.get('og_image_path')).trim(),
          bg_image_id: asString(form.get('bg_image_id')).trim(),
          max_width_override_px: asString(
            form.get('max_width_override_px'),
          ).trim(),
          html_content: asString(form.get('html_content')),
          css_module: asString(form.get('css_module')),
          svedit_doc: asString(form.get('svedit_doc')),
        },
      });
    }

    const updateResult = await locals.supabase
      .from('pages')
      .update(result.payload)
      .eq('id', id)
      .neq('kind', 'home');

    if (updateResult.error)
      return fail(400, { message: updateResult.error.message });

    redirectToList('Page updated.');
  },

  delete: async ({ locals, request }) => {
    const form = await request.formData();
    const id = asString(form.get('id'));
    if (!id) return fail(400, { message: 'Missing page id.' });

    const { error: deleteError } = await locals.supabase
      .from('pages')
      .update({
        visibility_status: 'draft',
        deleted_at: 'now',
      })
      .eq('id', id)
      .neq('kind', 'home');

    if (deleteError) return fail(400, { message: deleteError.message });

    redirectToList('Page deleted.');
  },

  rollback: async ({ locals, request }) => {
    const form = await request.formData();
    const id = asString(form.get('id'));
    if (!id) return fail(400, { message: 'Missing page id.' });

    const revisionId = Number(asString(form.get('revision_id')));
    if (!Number.isFinite(revisionId))
      return fail(400, { message: 'Invalid revision id.' });

    const { data: revision, error: revisionError } = await locals.supabase
      .from('content_revisions')
      .select('id, entity_type, entity_pk, snapshot')
      .eq('id', revisionId)
      .eq('entity_type', 'page')
      .eq('entity_pk', id)
      .maybeSingle();

    if (revisionError || !revision)
      return fail(404, { message: 'Revision not found.' });

    const snapshot = revision.snapshot as Record<string, unknown>;
    const kindVal = String(snapshot.kind ?? 'custom');
    if (kindVal === 'home')
      return fail(400, {
        message: 'Cannot roll back homepage from this route.',
      });

    const visibilityRaw = String(snapshot.visibility_status ?? '').trim();
    if (!visibilityRaw) {
      return fail(400, {
        message:
          'This revision predates page visibility_status and cannot be rolled back.',
      });
    }
    const visibilityStatus = (
      visibilityRaw === 'public' ||
      visibilityRaw === 'unlisted' ||
      visibilityRaw === 'draft'
        ? visibilityRaw
        : null
    ) as PageVisibilityStatus | null;
    if (!visibilityStatus) {
      return fail(400, { message: 'Invalid visibility status in revision.' });
    }
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

    const payload = {
      slug: String(snapshot.slug ?? ''),
      title: String(snapshot.title ?? ''),
      kind: 'custom' as const,
      html_content: sanitizedHtml,
      css_module:
        editorMode === 'code'
          ? sanitizeCmsCssRaw(String(snapshot.css_module ?? ''))
          : '',
      tailwind_css: tailwindCss,
      editor_mode:
        editorMode as Database['public']['Enums']['page_editor_mode'],
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
      bg_image_id:
        typeof snapshot.bg_image_id === 'string' &&
        UUID_REGEX.test(snapshot.bg_image_id)
          ? snapshot.bg_image_id
          : null,
      max_width_override_px: toPositiveIntegerOrNull(
        snapshot.max_width_override_px,
      ),
      visibility_status: visibilityStatus,
      nav_order: Number(snapshot.nav_order ?? 0),
      deleted_at: null,
    };

    const slugProblem = validateCmsPageSlug(payload.slug);
    if (slugProblem) return fail(400, { message: slugProblem });
    if (await isGallerySlugTaken(locals, payload.slug)) {
      return fail(400, {
        message: 'Slug conflicts with an existing gallery.',
      });
    }
    if (
      payload.editor_mode === 'code' &&
      payload.html_content.toLowerCase().includes('<iframe')
    )
      return fail(400, {
        message: 'Cannot roll back to iframe content in v1.',
      });

    const updateResult = await locals.supabase
      .from('pages')
      .update(payload)
      .eq('id', id)
      .neq('kind', 'home');

    if (updateResult.error)
      return fail(400, { message: updateResult.error.message });

    redirectToList('Page rolled back from revision.');
  },
};
