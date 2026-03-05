import { json, redirect } from '@sveltejs/kit';
import {
  asPositiveInt,
  loadGalleryPage,
  normalizePageSize,
  resolveGalleryScope,
} from '$lib/server/gallery';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ locals, params, url }) => {
  const scopeResolution = await resolveGalleryScope(locals, params.rootSlug);

  if (scopeResolution.kind === 'redirect') {
    throw redirect(
      301,
      `/${encodeURIComponent(scopeResolution.toSlug)}/feed${url.search}`,
    );
  }

  if (scopeResolution.kind !== 'scope') {
    return json({ message: 'Not found' }, { status: 404 });
  }

  const page = asPositiveInt(url.searchParams.get('page'), 1);
  const pageSize = normalizePageSize(
    asPositiveInt(url.searchParams.get('pageSize'), 60),
  );
  const q = url.searchParams.get('q')?.trim() ?? '';

  const { photos, hasMore } = await loadGalleryPage(locals, {
    scope: scopeResolution.scope,
    page,
    pageSize,
    q,
  });

  return json({ photos, hasMore, page, pageSize });
};
