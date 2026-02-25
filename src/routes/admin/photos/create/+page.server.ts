import { redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { loadSinglePhotoEditorData } from '$lib/server/admin/photos/load-single';
import { photoCoreActions } from '$lib/server/admin/photos/photo-core';
import { photoImageActions } from '$lib/server/admin/photos/photo-images';
import { photoTaxonomyActions } from '$lib/server/admin/photos/photo-taxonomy';

const ACTIVE_CREATE_PHOTO_COOKIE = 'admin_create_photo_id';

export const load: PageServerLoad = async ({ locals, url, cookies }) => {
  const requestedPhotoId = url.searchParams.get('photo');
  const cookiePhotoId = cookies.get(ACTIVE_CREATE_PHOTO_COOKIE);
  const existingPhotoId = requestedPhotoId ?? cookiePhotoId ?? null;

  if (!existingPhotoId) {
    const draftSlug = `new-photo-${Date.now().toString(36)}`;
    const insertResult = await locals.supabase
      .from('photos')
      .insert({
        title: 'New Photo',
        slug: draftSlug,
        capture_date: null,
        description: null,
        width_px: null,
        height_px: null,
        license_text: null,
        og_title: null,
        og_description: null,
        og_image_path: null,
        is_searchable: true,
        status: 'published',
        deleted_at: null
      })
      .select('id')
      .single();

    if (insertResult.error || !insertResult.data) {
      throw redirect(303, `/admin/photos?message=${encodeURIComponent(insertResult.error?.message ?? 'Failed to initialize new photo.')}`);
    }

    cookies.set(ACTIVE_CREATE_PHOTO_COOKIE, insertResult.data.id, {
      path: '/admin/photos',
      httpOnly: true,
      sameSite: 'lax'
    });

    throw redirect(303, `/admin/photos/create?photo=${insertResult.data.id}`);
  }

  cookies.set(ACTIVE_CREATE_PHOTO_COOKIE, existingPhotoId, {
    path: '/admin/photos',
    httpOnly: true,
    sameSite: 'lax'
  });

  try {
    return await loadSinglePhotoEditorData(locals, existingPhotoId);
  } catch (cause) {
    if (typeof cause === 'object' && cause !== null && 'status' in cause && cause.status === 404) {
      cookies.delete(ACTIVE_CREATE_PHOTO_COOKIE, { path: '/admin/photos' });
      throw redirect(303, '/admin/photos/create');
    }
    throw cause;
  }
};

export const actions: Actions = {
  ...photoCoreActions,
  ...photoTaxonomyActions,
  ...photoImageActions
};
