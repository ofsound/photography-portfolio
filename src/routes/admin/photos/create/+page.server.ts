import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { loadSinglePhotoEditorData } from '$lib/server/admin/photos/load-single';
import { createMinimalDraftPhoto, photoCoreActions, upsertPhotoPayload } from '$lib/server/admin/photos/photo-core';
import { photoImageActions, uploadImageWithForm } from '$lib/server/admin/photos/photo-images';
import { photoTaxonomyActions } from '$lib/server/admin/photos/photo-taxonomy';
import { asString } from '$lib/server/admin-helpers';

const ACTIVE_CREATE_PHOTO_COOKIE = 'admin_create_photo_id';

export const load: PageServerLoad = async ({ locals, url, cookies }) => {
  const requestedPhotoId = url.searchParams.get('photo');

  if (!requestedPhotoId) {
    cookies.delete(ACTIVE_CREATE_PHOTO_COOKIE, { path: '/admin/photos' });
    const [categoriesResult, tagsResult] = await Promise.all([
      locals.supabase.from('categories').select('id, name, slug, is_active').order('name', { ascending: true }),
      locals.supabase.from('tags').select('id, name, slug, is_active').order('name', { ascending: true })
    ]);
    if (categoriesResult.error) throw new Error(categoriesResult.error.message);
    if (tagsResult.error) throw new Error(tagsResult.error.message);

    const draftPhoto = {
      id: null as string | null,
      title: 'New Photo',
      slug: '',
      capture_date: null as string | null,
      description: null as string | null,
      dimensions: null as string | null,
      license_text: null as string | null,
      og_title: null as string | null,
      og_description: null as string | null,
      og_image_path: null as string | null,
      status: 'published',
      deleted_at: null as string | null,
      updated_at: ''
    };

    return {
      photo: draftPhoto,
      categories: categoriesResult.data ?? [],
      tags: tagsResult.data ?? [],
      selectedCategoryIds: [] as string[],
      selectedTagIds: [] as string[],
      images: [] as Awaited<ReturnType<typeof loadSinglePhotoEditorData>>['images'],
      photoConversionState: 'no-images' as const,
      pendingConversionCount: 0
    };
  }

  cookies.set(ACTIVE_CREATE_PHOTO_COOKIE, requestedPhotoId, {
    path: '/admin/photos',
    httpOnly: true,
    sameSite: 'lax'
  });

  try {
    return await loadSinglePhotoEditorData(locals, requestedPhotoId);
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
  ...photoImageActions,
  uploadImage: async ({ locals, request, cookies }) => {
    const form = await request.formData();
    if (asString(form.get('photo_id')) !== 'draft') {
      return uploadImageWithForm(locals, form);
    }
    let newId: string;
    try {
      const result = await createMinimalDraftPhoto(locals);
      newId = result.id;
    } catch (err) {
      return fail(400, { message: err instanceof Error ? err.message : 'Failed to create draft photo.' });
    }
    cookies.set(ACTIVE_CREATE_PHOTO_COOKIE, newId, {
      path: '/admin/photos',
      httpOnly: true,
      sameSite: 'lax'
    });
    const imageFile = form.get('image_file');
    const newForm = new FormData();
    newForm.set('photo_id', newId);
    if (imageFile instanceof File) newForm.set('image_file', imageFile);
    newForm.set('kind', asString(form.get('kind'), 'additional'));
    newForm.set('alt_text', asString(form.get('alt_text')));
    const result = await uploadImageWithForm(locals, newForm);
    if (result.success) {
      throw redirect(303, `/admin/photos/create?photo=${newId}`);
    }
    return result;
  },
  create: async ({ locals, request, cookies }) => {
    const form = await request.formData();
    const result = upsertPhotoPayload(form);
    if (!result.ok) return fail(400, { message: result.message });

    const insertResult = await locals.supabase
      .from('photos')
      .insert({
        ...result.payload,
        status: 'published',
        deleted_at: null
      })
      .select('id')
      .single();

    if (insertResult.error || !insertResult.data) {
      return fail(400, { message: insertResult.error?.message ?? 'Failed to create photo.' });
    }

    const newId = insertResult.data.id;
    cookies.set(ACTIVE_CREATE_PHOTO_COOKIE, newId, {
      path: '/admin/photos',
      httpOnly: true,
      sameSite: 'lax'
    });
    throw redirect(303, `/admin/photos/create?photo=${newId}`);
  }
};
