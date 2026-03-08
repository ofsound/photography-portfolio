import { throwLoaderError } from '$lib/server/load-error';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
  const q = url.searchParams.get('q')?.trim() ?? '';

  if (!q) {
    return { q, results: [] };
  }

  const query = await locals.supabase
    .from('photos')
    .select(
      'id, slug, title, description, gallery_id, galleries!inner(slug, visibility_status)',
    )
    .eq('status', 'published')
    .is('deleted_at', null)
    .eq('galleries.visibility_status', 'public')
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
    results: (query.data ?? []).map((row) => ({
      id: row.id,
      slug: row.slug,
      title: row.title,
      description: row.description,
      gallery_slug: Array.isArray(row.galleries)
        ? (row.galleries[0]?.slug ?? 'all')
        : (row.galleries?.slug ?? 'all'),
    })),
  };
};
