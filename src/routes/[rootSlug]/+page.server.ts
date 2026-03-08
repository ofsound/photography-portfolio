import { fail, redirect, type Actions } from '@sveltejs/kit';

import { getCmsRole } from '$lib/server/admin-helpers';
import {
  createDefaultSveditPageDocument,
  parseSveditPageDocument,
  SVEDIT_PAGE_SCHEMA_VERSION,
} from '$lib/svedit/page-document';
import type { PageServerLoad } from './$types';

const canEditPublicPages = async (locals: App.Locals) => {
  const role = await getCmsRole(locals);
  return role === 'admin' || role === 'editor';
};

export const load: PageServerLoad = async ({ locals, url }) => {
  const canEdit = await canEditPublicPages(locals);
  return {
    canEditPublicPages: canEdit,
    initialPublicEditMode:
      canEdit && Boolean(url.searchParams.get('edit') === '1'),
  };
};

export const actions: Actions = {
  save: async ({ locals, request, params }) => {
    const canEdit = await canEditPublicPages(locals);
    if (!canEdit) {
      return fail(403, { message: 'Editor access required.' });
    }

    const form = await request.formData();
    const slug = params.rootSlug ?? '';
    const rawSveditDoc = String(form.get('svedit_doc') ?? '').trim();

    const pageResult = await locals.supabase
      .from('pages')
      .select('id, editor_mode')
      .eq('slug', slug)
      .eq('status', 'published')
      .is('deleted_at', null)
      .neq('kind', 'home')
      .maybeSingle();

    if (pageResult.error) {
      return fail(500, { message: pageResult.error.message });
    }

    if (!pageResult.data) {
      return fail(404, { message: 'Page not found.' });
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
      .neq('kind', 'home');

    if (updateResult.error) {
      return fail(400, { message: updateResult.error.message });
    }

    const next = new URL(request.url);
    next.searchParams.set('edit', '1');

    throw redirect(303, `${next.pathname}${next.search}`);
  },
};
