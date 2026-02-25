import { fail, type Actions } from '@sveltejs/kit';
import { asBoolean, asString, parseUuidList } from '$lib/server/admin-helpers';

export const bulkPhotoActions: Actions = {
  bulkArchivePhotos: async ({ locals, request }) => {
    const form = await request.formData();
    const photoIds = parseUuidList(asString(form.get('selected_photo_ids')));
    if (!photoIds.length) return fail(400, { message: 'Select at least one photo.' });

    const { error } = await locals.supabase
      .from('photos')
      .update({ status: 'archived', deleted_at: new Date().toISOString() })
      .in('id', photoIds);

    if (error) return fail(400, { message: error.message });
    return { success: true, message: `Archived ${photoIds.length} photo(s).` };
  },

  bulkRestorePhotos: async ({ locals, request }) => {
    const form = await request.formData();
    const photoIds = parseUuidList(asString(form.get('selected_photo_ids')));
    if (!photoIds.length) return fail(400, { message: 'Select at least one photo.' });

    const { error } = await locals.supabase
      .from('photos')
      .update({ status: 'published', deleted_at: null })
      .in('id', photoIds);

    if (error) return fail(400, { message: error.message });
    return { success: true, message: `Restored ${photoIds.length} photo(s).` };
  },

  bulkSetSearchable: async ({ locals, request }) => {
    const form = await request.formData();
    const photoIds = parseUuidList(asString(form.get('selected_photo_ids')));
    const searchable = asBoolean(form.get('searchable'));
    if (!photoIds.length) return fail(400, { message: 'Select at least one photo.' });

    const { error } = await locals.supabase.from('photos').update({ is_searchable: searchable }).in('id', photoIds);
    if (error) return fail(400, { message: error.message });

    return {
      success: true,
      message: `${searchable ? 'Enabled' : 'Disabled'} search for ${photoIds.length} photo(s).`
    };
  }
};

