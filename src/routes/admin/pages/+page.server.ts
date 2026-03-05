import { fail, type Actions } from '@sveltejs/kit';
import { pagePayloadFromForm } from '$lib/server/admin/page-form';
import { throwLoaderError } from '$lib/server/load-error';
import { isGallerySlugTaken } from '$lib/server/root-slug';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
  const pagesQuery = await locals.supabase
    .from('pages')
    .select('id, slug, title, kind, status, updated_at')
    .neq('kind', 'home')
    .order('updated_at', { ascending: false });

  if (pagesQuery.error) {
    throwLoaderError(
      { route: '/admin/pages', operation: 'load pages list' },
      pagesQuery.error,
    );
  }

  return {
    pages: pagesQuery.data ?? [],
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

    const { error } = await locals.supabase
      .from('pages')
      .insert(result.payload);
    if (error) {
      return fail(400, { message: error.message });
    }

    return { success: true, message: 'Page created.' };
  },
};
