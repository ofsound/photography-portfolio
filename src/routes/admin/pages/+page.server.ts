import { fail, type Actions } from '@sveltejs/kit';
import { pagePayloadFromForm } from '$lib/server/admin/page-form';
import { throwLoaderError } from '$lib/server/load-error';
import { isGallerySlugTaken } from '$lib/server/root-slug';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
  const pagesWithSvedit = await locals.supabase
    .from('pages')
    .select('id, slug, title, kind, editor_mode, status, updated_at')
    .neq('kind', 'home')
    .order('updated_at', { ascending: false });

  if (pagesWithSvedit.error) {
    throwLoaderError(
      { route: '/admin/pages', operation: 'load pages list' },
      pagesWithSvedit.error,
    );
  }

  return {
    pages: pagesWithSvedit.data ?? [],
    message: url.searchParams.get('message'),
  };
};

export const actions: Actions = {
  create: async ({ locals, request }) => {
    const form = await request.formData();
    const result = pagePayloadFromForm(form);

    if (!result.ok) return fail(400, { message: result.message });
    if (await isGallerySlugTaken(locals, result.payload.slug)) {
      return fail(400, {
        message: 'Slug conflicts with an existing gallery.',
      });
    }

    const insertResult = await locals.supabase
      .from('pages')
      .insert(result.payload);

    if (insertResult.error) {
      return fail(400, { message: insertResult.error.message });
    }

    return { success: true, message: 'Page created.' };
  },
};
