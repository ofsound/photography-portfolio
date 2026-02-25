import { error, fail, redirect, type Actions } from '@sveltejs/kit';
import { asString } from '$lib/server/admin-helpers';
import { pagePayloadFromForm, validateCmsPageSlug, type PublishStatus } from '$lib/server/admin/page-form';
import { sanitizeCmsCss, sanitizeCmsHtml } from '$lib/server/cms-sanitize';
import type { Database } from '$lib/types/database';
import type { PageServerLoad } from './$types';

const PAGE_SELECT =
  'id, slug, title, kind, html_content, css_module, seo_title, seo_description, og_image_path, status, show_in_nav, nav_order, deleted_at, updated_at';
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
type PageRow = Database['public']['Tables']['pages']['Row'];

const redirectToList = (message: string) => {
  throw redirect(303, `/admin/pages?message=${encodeURIComponent(message)}`);
};

export const load: PageServerLoad = async ({ locals, params }) => {
  const identifier = params.identifier;
  let page: PageRow | null = null;

  if (UUID_REGEX.test(identifier)) {
    const byId = await locals.supabase.from('pages').select(PAGE_SELECT).eq('id', identifier).neq('kind', 'home').maybeSingle();
    if (byId.error) throw error(500, byId.error.message);
    page = byId.data as PageRow | null;
  }

  if (!page) {
    const bySlug = await locals.supabase.from('pages').select(PAGE_SELECT).eq('slug', identifier).neq('kind', 'home').maybeSingle();
    if (bySlug.error) throw error(500, bySlug.error.message);
    page = bySlug.data as PageRow | null;
  }

  if (!page) {
    throw error(404, 'Page not found');
  }

  const revisionsQuery = await locals.supabase
    .from('content_revisions')
    .select('id, entity_type, entity_pk, version_no, changed_at, changed_by, snapshot')
    .eq('entity_type', 'page')
    .eq('entity_pk', String(page.id))
    .order('changed_at', { ascending: false })
    .limit(100);

  if (revisionsQuery.error) throw error(500, revisionsQuery.error.message);

  return {
    page,
    revisions: revisionsQuery.data ?? []
  };
};

export const actions: Actions = {
  update: async ({ locals, request }) => {
    const form = await request.formData();
    const id = asString(form.get('id'));
    if (!id) return fail(400, { message: 'Missing page id.' });

    const result = pagePayloadFromForm(form);
    if (!result.ok) return fail(400, { message: result.message });

    const { error: updateError } = await locals.supabase.from('pages').update(result.payload).eq('id', id).neq('kind', 'home');
    if (updateError) return fail(400, { message: updateError.message });

    redirectToList('Page updated.');
  },

  archive: async ({ locals, request }) => {
    const form = await request.formData();
    const id = asString(form.get('id'));
    if (!id) return fail(400, { message: 'Missing page id.' });

    const { error: archiveError } = await locals.supabase
      .from('pages')
      .update({ status: 'archived', deleted_at: new Date().toISOString() })
      .eq('id', id)
      .neq('kind', 'home');

    if (archiveError) return fail(400, { message: archiveError.message });

    redirectToList('Page archived.');
  },

  restore: async ({ locals, request }) => {
    const form = await request.formData();
    const id = asString(form.get('id'));
    if (!id) return fail(400, { message: 'Missing page id.' });

    const { error: restoreError } = await locals.supabase
      .from('pages')
      .update({ status: 'published', deleted_at: null })
      .eq('id', id)
      .neq('kind', 'home');

    if (restoreError) return fail(400, { message: restoreError.message });

    redirectToList('Page restored.');
  },

  rollback: async ({ locals, request }) => {
    const form = await request.formData();
    const id = asString(form.get('id'));
    if (!id) return fail(400, { message: 'Missing page id.' });

    const revisionId = Number(asString(form.get('revision_id')));
    if (!Number.isFinite(revisionId)) return fail(400, { message: 'Invalid revision id.' });

    const { data: revision, error: revisionError } = await locals.supabase
      .from('content_revisions')
      .select('id, entity_type, entity_pk, snapshot')
      .eq('id', revisionId)
      .eq('entity_type', 'page')
      .eq('entity_pk', id)
      .maybeSingle();

    if (revisionError || !revision) return fail(404, { message: 'Revision not found.' });

    const snapshot = revision.snapshot as Record<string, unknown>;
    const kindVal = String(snapshot.kind ?? 'custom');
    if (kindVal === 'home') return fail(400, { message: 'Cannot roll back homepage from this route.' });

    const statusVal = String(snapshot.status ?? 'published');
    const payload = {
      slug: String(snapshot.slug ?? ''),
      title: String(snapshot.title ?? ''),
      kind: 'custom' as const,
      html_content: sanitizeCmsHtml(String(snapshot.html_content ?? '')),
      css_module: sanitizeCmsCss(String(snapshot.css_module ?? ''), String(snapshot.slug ?? 'page')),
      seo_title: snapshot.seo_title ? String(snapshot.seo_title) : null,
      seo_description: snapshot.seo_description ? String(snapshot.seo_description) : null,
      og_image_path: snapshot.og_image_path ? String(snapshot.og_image_path) : null,
      status: (statusVal === 'archived' ? 'archived' : 'published') as PublishStatus,
      show_in_nav: Boolean(snapshot.show_in_nav),
      nav_order: Number(snapshot.nav_order ?? 0),
      deleted_at: snapshot.deleted_at ? String(snapshot.deleted_at) : null
    };

    const slugProblem = validateCmsPageSlug(payload.slug);
    if (slugProblem) return fail(400, { message: slugProblem });
    if (payload.html_content.toLowerCase().includes('<iframe')) return fail(400, { message: 'Cannot roll back to iframe content in v1.' });

    const { error: updateError } = await locals.supabase.from('pages').update(payload).eq('id', id).neq('kind', 'home');
    if (updateError) return fail(400, { message: updateError.message });

    redirectToList('Page rolled back from revision.');
  }
};
