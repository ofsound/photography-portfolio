import { error, redirect } from '@sveltejs/kit';
import { resolveGalleryForAdmin } from '$lib/server/admin/galleries';
import { loadSinglePhotoEditorData } from '$lib/server/admin/photos/load-single';
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
  const editorData = await loadSinglePhotoEditorData(
    locals,
    params.identifier,
    gallery.id,
  );

  return {
    ...editorData,
    gallery,
    message: url.searchParams.get('message'),
  };
};

export const actions: Actions = {
  ...photoCoreActions,
  ...photoTaxonomyActions,
  ...photoImageActions,
};
