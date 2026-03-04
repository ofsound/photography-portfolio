import { throwLoaderError } from '$lib/server/load-error';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
  const q = url.searchParams.get('q')?.trim() ?? '';

  if (!q) {
    return { q, results: [] };
  }

  const query = await locals.supabase
    .from('photos')
    .select('id, slug, title, description')
    .eq('status', 'published')
    .is('deleted_at', null)
    .textSearch('search_tsv', q, { type: 'websearch' })
    .limit(80);

  if (query.error) {
    throwLoaderError(
      { route: '/search', operation: 'search photos', details: { q } },
      query.error,
    );
  }

  return {
    q,
    results: query.data ?? [],
  };
};
