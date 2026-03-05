import { error, redirect } from '@sveltejs/kit';
import { resolveGalleryForAdmin } from '$lib/server/admin/galleries';
import { bulkPhotoActions } from '$lib/server/admin/photos/bulk-actions';
import { loadAdminPhotosPage } from '$lib/server/admin/photos/load';
import { photoCoreActions } from '$lib/server/admin/photos/photo-core';
import { photoImageActions } from '$lib/server/admin/photos/photo-images';
import { photoTaxonomyActions } from '$lib/server/admin/photos/photo-taxonomy';
import type { Actions, PageServerLoad } from './$types';

const resolveGallery = async (locals: App.Locals, gallerySlug: string) => {
  const resolved = await resolveGalleryForAdmin(locals, gallerySlug);
  if (resolved.kind === 'redirect') {
    throw redirect(301, `/admin/${resolved.toSlug}/photos`);
  }
  if (resolved.kind !== 'gallery') {
    throw error(404, 'Gallery not found.');
  }
  return resolved.gallery;
};

export const load: PageServerLoad = async ({ locals, params, url }) => {
  const gallery = await resolveGallery(locals, params.gallerySlug);
  const payload = await loadAdminPhotosPage({
    locals,
    url,
    scope: {
      kind: 'gallery',
      galleryId: gallery.id,
      gallerySlug: gallery.slug,
    },
  });

  return {
    ...payload,
    gallery,
  };
};

export const actions: Actions = {
  ...photoCoreActions,
  ...bulkPhotoActions,
  ...photoTaxonomyActions,
  ...photoImageActions,
};
