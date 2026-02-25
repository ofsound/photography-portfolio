import { fail, type Actions } from '@sveltejs/kit';
import { asBoolean, asOptionalDate, asOptionalNumber, asString, toSlug } from '$lib/server/admin-helpers';

export type PhotoPayload = {
  title: string;
  slug: string;
  capture_date: string | null;
  description: string | null;
  width_px: number | null;
  height_px: number | null;
  license_text: string | null;
  og_title: string | null;
  og_description: string | null;
  og_image_path: string | null;
  is_searchable: boolean;
};

export const upsertPhotoPayload = (form: FormData): { ok: true; payload: PhotoPayload } | { ok: false; message: string } => {
  const title = asString(form.get('title')).trim();
  const slugInput = asString(form.get('slug')).trim();

  if (!title) {
    return { ok: false, message: 'Title is required.' };
  }

  return {
    ok: true,
    payload: {
      title,
      slug: toSlug(slugInput || title, 'photo'),
      capture_date: asOptionalDate(form.get('capture_date')),
      description: asString(form.get('description')).trim() || null,
      width_px: asOptionalNumber(form.get('width_px')),
      height_px: asOptionalNumber(form.get('height_px')),
      license_text: asString(form.get('license_text')).trim() || null,
      og_title: asString(form.get('og_title')).trim() || null,
      og_description: asString(form.get('og_description')).trim() || null,
      og_image_path: asString(form.get('og_image_path')).trim() || null,
      is_searchable: asBoolean(form.get('is_searchable'))
    }
  };
};

export const photoCoreActions: Actions = {
  create: async ({ locals, request }) => {
    const form = await request.formData();
    const result = upsertPhotoPayload(form);

    if (!result.ok) return fail(400, { message: result.message });

    const { error } = await locals.supabase.from('photos').insert({
      ...result.payload,
      status: 'published',
      deleted_at: null
    });

    if (error) return fail(400, { message: error.message });
    return { success: true, message: 'Photo created.' };
  },

  update: async ({ locals, request }) => {
    const form = await request.formData();
    const id = asString(form.get('id'));
    if (!id) return fail(400, { message: 'Missing photo id.' });

    const result = upsertPhotoPayload(form);
    if (!result.ok) return fail(400, { message: result.message });

    const { error } = await locals.supabase.from('photos').update(result.payload).eq('id', id);

    if (error) return fail(400, { message: error.message });
    return { success: true, message: 'Photo updated.' };
  },

  archive: async ({ locals, request }) => {
    const form = await request.formData();
    const id = asString(form.get('id'));
    const { error } = await locals.supabase
      .from('photos')
      .update({ status: 'archived', deleted_at: new Date().toISOString() })
      .eq('id', id);

    if (error) return fail(400, { message: error.message });
    return { success: true, message: 'Photo archived.' };
  },

  restore: async ({ locals, request }) => {
    const form = await request.formData();
    const id = asString(form.get('id'));
    const { error } = await locals.supabase.from('photos').update({ status: 'published', deleted_at: null }).eq('id', id);

    if (error) return fail(400, { message: error.message });
    return { success: true, message: 'Photo restored.' };
  }
};
