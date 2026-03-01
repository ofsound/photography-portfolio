import { fail, type Actions } from '@sveltejs/kit';
import { asOptionalDate, asString, toSlug } from '$lib/server/admin-helpers';

type MinimalDraftSeed = {
  title?: string;
  slug?: string;
};

const draftStatusMigrationHint =
  'Database schema is missing draft photo status. Apply migration 20260302_photo_draft_status.sql and retry.';

export const normalizeDraftStatusErrorMessage = (message: string) =>
  message.includes('invalid input value for enum publish_status') && message.includes('"draft"')
    ? draftStatusMigrationHint
    : message;

/** Creates a minimal photo row for draft (e.g. on first upload). Returns the new id or throws. */
export async function createMinimalDraftPhoto(locals: App.Locals, seed: MinimalDraftSeed = {}): Promise<{ id: string }> {
  const fallbackTitle = 'New Photo';
  const title = seed.title?.trim() || fallbackTitle;
  const slugBase = toSlug(seed.slug?.trim() || title, 'photo');
  const makeSlug = (withSuffix: boolean) =>
    withSuffix ? `${slugBase}-${Math.random().toString(36).slice(2, 8)}` : slugBase;

  const insertDraft = async (slug: string) =>
    locals.supabase
      .from('photos')
      .insert({
        title,
        slug,
        capture_date: null,
        description: null,
        dimensions: null,
        license_text: null,
        og_title: null,
        og_description: null,
        og_image_path: null,
        status: 'draft',
        deleted_at: null
      })
      .select('id')
      .single();

  let insertResult = await insertDraft(makeSlug(false));

  // Retry once with a randomized suffix to avoid slug collisions for common titles.
  if (insertResult.error?.code === '23505') {
    insertResult = await insertDraft(makeSlug(true));
  }

  if (insertResult.error || !insertResult.data) {
    throw new Error(normalizeDraftStatusErrorMessage(insertResult.error?.message ?? 'Failed to create draft photo.'));
  }
  return { id: insertResult.data.id };
}

export type PhotoPayload = {
  title: string;
  slug: string;
  capture_date: string | null;
  description: string | null;
  dimensions: string | null;
  license_text: string | null;
  og_title: string | null;
  og_description: string | null;
  og_image_path: string | null;
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
      dimensions: asString(form.get('dimensions')).trim() || null,
      license_text: asString(form.get('license_text')).trim() || null,
      og_title: asString(form.get('og_title')).trim() || null,
      og_description: asString(form.get('og_description')).trim() || null,
      og_image_path: asString(form.get('og_image_path')).trim() || null
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
      status: 'draft',
      deleted_at: null
    });

    if (error) return fail(400, { message: normalizeDraftStatusErrorMessage(error.message) });
    return { success: true, message: 'Draft created.' };
  },

  update: async ({ locals, request }) => {
    const form = await request.formData();
    const id = asString(form.get('id'));
    if (!id) return fail(400, { message: 'Missing photo id.' });

    const result = upsertPhotoPayload(form);
    if (!result.ok) return fail(400, { message: result.message });

    const { error } = await locals.supabase
      .from('photos')
      .update({ ...result.payload, updated_at: new Date().toISOString() })
      .eq('id', id);

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

  publish: async ({ locals, request }) => {
    const form = await request.formData();
    const id = asString(form.get('id'));
    if (!id) return fail(400, { message: 'Missing photo id.' });

    const { data: photo, error: photoError } = await locals.supabase
      .from('photos')
      .select('id, title, status, deleted_at')
      .eq('id', id)
      .maybeSingle();
    if (photoError) return fail(400, { message: photoError.message });
    if (!photo) return fail(404, { message: 'Photo not found.' });
    if (photo.status === 'archived' || photo.deleted_at) {
      return fail(400, { message: 'Restore this photo to draft before publishing.' });
    }
    if (!photo.title.trim()) return fail(400, { message: 'Title is required before publishing.' });

    const { data: lead, error: leadError } = await locals.supabase
      .from('photo_images')
      .select('id, delivery_storage_path')
      .eq('photo_id', id)
      .eq('kind', 'lead')
      .maybeSingle();

    if (leadError) return fail(400, { message: leadError.message });
    if (!lead) return fail(400, { message: 'Set a lead image before publishing.' });
    if (!lead.delivery_storage_path) {
      return fail(400, { message: 'Lead image is still processing. Wait until conversion finishes.' });
    }

    const { error } = await locals.supabase
      .from('photos')
      .update({ status: 'published', deleted_at: null, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) return fail(400, { message: error.message });
    return { success: true, message: 'Photo published.' };
  },

  restore: async ({ locals, request }) => {
    const form = await request.formData();
    const id = asString(form.get('id'));
    const { error } = await locals.supabase.from('photos').update({ status: 'draft', deleted_at: null }).eq('id', id);

    if (error) return fail(400, { message: error.message });
    return { success: true, message: 'Photo restored to draft.' };
  }
};
