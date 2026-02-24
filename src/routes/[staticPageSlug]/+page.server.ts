import { error } from '@sveltejs/kit';
import { loadPageBySlug } from '$lib/server/pages';
import { RESERVED_SLUGS } from '$lib/server/reserved-slugs';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, params }) => {
  if (RESERVED_SLUGS.has(params.staticPageSlug)) {
    throw error(404, 'Not found');
  }

  const page = await loadPageBySlug(locals, params.staticPageSlug);

  if (!page || page.kind !== 'custom') {
    throw error(404, 'Not found');
  }

  return { page };
};
