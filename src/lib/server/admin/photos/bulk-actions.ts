import { fail, type Actions } from '@sveltejs/kit';
import { asString, parseUuidList } from '$lib/server/admin-helpers';

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

  bulkDeletePhotos: async ({ locals, request }) => {
    const form = await request.formData();
    if (asString(form.get('showArchived')) !== '1') {
      return fail(400, { message: 'Delete is only allowed when viewing archived photos.' });
    }
    const photoIds = parseUuidList(asString(form.get('selected_photo_ids')));
    if (!photoIds.length) return fail(400, { message: 'Select at least one photo.' });

    const { data: photos, error: photosError } = await locals.supabase
      .from('photos')
      .select('id, status, deleted_at')
      .in('id', photoIds);

    if (photosError) return fail(400, { message: photosError.message });
    const notArchived = (photos ?? []).filter(
      (p: { status: string; deleted_at: string | null }) => p.status !== 'archived' || p.deleted_at == null
    );
    if (notArchived.length > 0) {
      return fail(400, { message: 'Only archived photos can be permanently deleted.' });
    }

    const { data: images, error: imagesError } = await locals.supabase
      .from('photo_images')
      .select('source_storage_path, delivery_storage_path')
      .in('photo_id', photoIds);

    if (imagesError) return fail(400, { message: imagesError.message });

    const pathsToRemove = (images ?? []).flatMap((row: { source_storage_path: string; delivery_storage_path: string | null }) =>
      [row.source_storage_path, row.delivery_storage_path].filter(Boolean)
    ) as string[];
    if (pathsToRemove.length > 0) {
      const { error: storageError } = await locals.supabase.storage.from('photos').remove(pathsToRemove);
      if (storageError) return fail(400, { message: storageError.message });
    }

    const { error: deleteError } = await locals.supabase.from('photos').delete().in('id', photoIds);
    if (deleteError) return fail(400, { message: deleteError.message });
    return { success: true, message: `Deleted ${photoIds.length} photo(s) and their files.` };
  },

  reorderPhotos: async ({ locals, request }) => {
    const form = await request.formData();
    const orderedIds = parseUuidList(asString(form.get('ordered_photo_ids')));
    if (!orderedIds.length) return fail(400, { message: 'No photo IDs provided.' });

    const updates = orderedIds.map((id, idx) =>
      locals.supabase.from('photos').update({ admin_sort_order: idx }).eq('id', id)
    );

    for (const update of updates) {
      const { error } = await update;
      if (error) return fail(400, { message: error.message });
    }

    return { success: true, message: 'Photo order saved.' };
  }
};

