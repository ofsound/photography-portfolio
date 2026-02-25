import type { Actions, PageServerLoad } from './$types';
import { bulkPhotoActions } from '$lib/server/admin/photos/bulk-actions';
import { loadAdminPhotosPage } from '$lib/server/admin/photos/load';
import { photoCoreActions } from '$lib/server/admin/photos/photo-core';
import { photoImageActions } from '$lib/server/admin/photos/photo-images';
import { photoTaxonomyActions } from '$lib/server/admin/photos/photo-taxonomy';

export const load: PageServerLoad = async (event) => {
  return loadAdminPhotosPage(event);
};

export const actions: Actions = {
  ...photoCoreActions,
  ...bulkPhotoActions,
  ...photoTaxonomyActions,
  ...photoImageActions
};

