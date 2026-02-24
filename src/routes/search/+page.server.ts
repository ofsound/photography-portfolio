import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
  const q = url.searchParams.get('q')?.trim() ?? '';

  if (!q) {
    return { q, results: [] };
  }

  const { data } = await locals.supabase
    .from('photos')
    .select('id, slug, title, description')
    .eq('status', 'published')
    .is('deleted_at', null)
    .textSearch('search_tsv', q, { type: 'websearch' })
    .limit(80);

  return {
    q,
    results: data ?? []
  };
};
