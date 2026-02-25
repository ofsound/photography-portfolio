import { json } from '@sveltejs/kit';
import { asPositiveInt, loadGalleryPage, normalizePageSize } from '$lib/server/gallery';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ locals, url }) => {
  const page = asPositiveInt(url.searchParams.get('page'), 1);
  const pageSize = normalizePageSize(asPositiveInt(url.searchParams.get('pageSize'), 60));
  const q = url.searchParams.get('q')?.trim() ?? '';

  const { photos, hasMore } = await loadGalleryPage(locals, { page, pageSize, q });
  return json({ photos, hasMore, page, pageSize });
};
