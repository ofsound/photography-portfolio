import { error, redirect } from '@sveltejs/kit';
import { resolveGalleryForAdmin } from '$lib/server/admin/galleries';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, params }) => {
  const resolved = await resolveGalleryForAdmin(locals, params.gallerySlug);
  if (resolved.kind === 'redirect') {
    throw redirect(301, `/admin/${resolved.toSlug}/photos/multiple`);
  }
  if (resolved.kind !== 'gallery') {
    throw error(404, 'Gallery not found.');
  }

  return {
    gallery: resolved.gallery,
  };
};
