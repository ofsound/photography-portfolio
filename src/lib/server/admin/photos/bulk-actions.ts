import { fail, type Actions } from '@sveltejs/kit';
import { asString, parseUuidList } from '$lib/server/admin-helpers';

export const bulkPhotoActions: Actions = {
  bulkPublishPhotos: async ({ locals, request }) => {
    const form = await request.formData();
    const photoIds = parseUuidList(asString(form.get('selected_photo_ids')));
    if (!photoIds.length) return fail(400, { message: 'Select at least one photo.' });

    const [{ data: photos, error: photosError }, { data: leads, error: leadsError }] = await Promise.all([
      locals.supabase.from('photos').select('id, title, status, deleted_at').in('id', photoIds),
      locals.supabase
        .from('photo_images')
        .select('photo_id, delivery_storage_path')
        .in('photo_id', photoIds)
        .eq('kind', 'lead')
    ]);

    if (photosError) return fail(400, { message: photosError.message });
    if (leadsError) return fail(400, { message: leadsError.message });

    const leadByPhotoId = new Map((leads ?? []).map((row) => [row.photo_id, row]));
    const publishable: string[] = [];

    for (const photo of photos ?? []) {
      if (photo.status === 'archived') continue;
      if (photo.deleted_at) continue;
      if (!photo.title?.trim()) continue;
      const lead = leadByPhotoId.get(photo.id);
      if (!lead || !lead.delivery_storage_path) continue;
      publishable.push(photo.id);
    }

    if (!publishable.length) {
      return fail(400, {
        message: 'No selected photos are publishable. Publish requires a title and a converted lead image.'
      });
    }

    const { error } = await locals.supabase
      .from('photos')
      .update({ status: 'published', deleted_at: null })
      .in('id', publishable);

    if (error) return fail(400, { message: error.message });

    const skipped = photoIds.length - publishable.length;
    return {
      success: true,
      message:
        skipped > 0
          ? `Published ${publishable.length} photo(s). Skipped ${skipped} (missing title/lead image readiness or archived).`
          : `Published ${publishable.length} photo(s).`
    };
  },

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
      .update({ status: 'draft', deleted_at: null })
      .in('id', photoIds);

    if (error) return fail(400, { message: error.message });
    return { success: true, message: `Restored ${photoIds.length} photo(s) to draft.` };
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

    const { error } = await locals.supabase.rpc('reorder_photos', {
      p_ordered_photo_ids: orderedIds
    });
    if (error) return fail(400, { message: error.message });

    return { success: true, message: 'Photo order saved.' };
  }
};
