import { error, fail, redirect, type Actions } from '@sveltejs/kit';
import { asString } from '$lib/server/admin-helpers';
import {
  pagePayloadFromForm,
  validateCmsPageSlug,
  type PagePublishStatus,
} from '$lib/server/admin/page-form';
import { sanitizeCmsCss, sanitizeCmsHtml } from '$lib/server/cms-sanitize';
import {
  parseSveditPageDocument,
  SVEDIT_PAGE_SCHEMA_VERSION,
} from '$lib/svedit/page-document';
import { isGallerySlugTaken } from '$lib/server/root-slug';
import type { Database } from '$lib/types/database';
import type { PageServerLoad } from './$types';

const PAGE_SELECT =
  'id, slug, title, kind, html_content, css_module, editor_mode, svedit_doc, svedit_schema_version, seo_title, seo_description, og_image_path, status, show_in_nav, nav_order, deleted_at, updated_at';
const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
type PageRow = Database['public']['Tables']['pages']['Row'];

const redirectToList = (message: string) => {
  throw redirect(303, `/admin/pages?message=${encodeURIComponent(message)}`);
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

  const revisionsQuery = await locals.supabase
    .from('content_revisions')
    .select(
      'id, entity_type, entity_pk, version_no, changed_at, changed_by, snapshot',
    )
    .eq('entity_type', 'page')
    .eq('entity_pk', String(page.id))
    .order('changed_at', { ascending: false })
    .limit(100);

  if (revisionsQuery.error) throw error(500, revisionsQuery.error.message);

  return {
    page,
    revisions: revisionsQuery.data ?? [],
  };
};

export const actions: Actions = {
  update: async ({ locals, request }) => {
    const form = await request.formData();
    const id = asString(form.get('id'));
    if (!id) return fail(400, { message: 'Missing page id.' });

    const result = pagePayloadFromForm(form);
    if (!result.ok) return fail(400, { message: result.message });
    if (await isGallerySlugTaken(locals, result.payload.slug)) {
      return fail(400, {
        message: 'Slug conflicts with an existing gallery.',
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

  draft: async ({ locals, request }) => {
    const form = await request.formData();
    const id = asString(form.get('id'));
    if (!id) return fail(400, { message: 'Missing page id.' });

    const { error: draftError } = await locals.supabase
      .from('pages')
      .update({ status: 'draft', deleted_at: null })
      .eq('id', id)
      .neq('kind', 'home');

    if (draftError) return fail(400, { message: draftError.message });

    redirectToList('Page set to draft.');
  },

  publish: async ({ locals, request }) => {
    const form = await request.formData();
    const id = asString(form.get('id'));
    if (!id) return fail(400, { message: 'Missing page id.' });

    const { error: publishError } = await locals.supabase
      .from('pages')
      .update({ status: 'published', deleted_at: null })
      .eq('id', id)
      .neq('kind', 'home');

    if (publishError) return fail(400, { message: publishError.message });

    redirectToList('Page published.');
  },

  delete: async ({ locals, request }) => {
    const form = await request.formData();
    const id = asString(form.get('id'));
    if (!id) return fail(400, { message: 'Missing page id.' });

    const { error: deleteError } = await locals.supabase
      .from('pages')
      .update({
        status: 'draft',
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

    const statusVal = String(snapshot.status ?? 'published');
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

    const payload = {
      slug: String(snapshot.slug ?? ''),
      title: String(snapshot.title ?? ''),
      kind: 'custom' as const,
      html_content:
        editorMode === 'code'
          ? sanitizeCmsHtml(String(snapshot.html_content ?? ''))
          : '',
      css_module:
        editorMode === 'code'
          ? sanitizeCmsCss(
              String(snapshot.css_module ?? ''),
              String(snapshot.slug ?? 'page'),
            )
          : '',
      editor_mode:
        editorMode as Database['public']['Enums']['page_editor_mode'],
      svedit_doc: sveditDocResult?.ok ? sveditDocResult.document : null,
      svedit_schema_version: SVEDIT_PAGE_SCHEMA_VERSION,
      seo_title: snapshot.seo_title ? String(snapshot.seo_title) : null,
      seo_description: snapshot.seo_description
        ? String(snapshot.seo_description)
        : null,
      og_image_path: snapshot.og_image_path
        ? String(snapshot.og_image_path)
        : null,
      status: (statusVal === 'published'
        ? 'published'
        : 'draft') as PagePublishStatus,
      show_in_nav: Boolean(snapshot.show_in_nav),
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
