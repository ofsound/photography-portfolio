import { loadSinglePhotoEditorData } from '$lib/server/admin/photos/load-single';
import { photoCoreActions } from '$lib/server/admin/photos/photo-core';
import { photoImageActions } from '$lib/server/admin/photos/photo-images';
import { photoTaxonomyActions } from '$lib/server/admin/photos/photo-taxonomy';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, params, url }) => {
  const editorData = await loadSinglePhotoEditorData(locals, params.identifier);

  return {
    ...editorData,
    message: url.searchParams.get('message')
  };
};

export const actions: Actions = {
  ...photoCoreActions,
  ...photoTaxonomyActions,
  ...photoImageActions
};
