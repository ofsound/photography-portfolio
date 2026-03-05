import { fail, type Actions } from '@sveltejs/kit';
import { asString, parseUuidList } from '$lib/server/admin-helpers';
import { movePhotosToGalleryWithAutoSuffix } from '$lib/server/admin/galleries';

export const bulkPhotoActions: Actions = {
  bulkPublishPhotos: async ({ locals, request }) => {
    const form = await request.formData();
    const photoIds = parseUuidList(asString(form.get('selected_photo_ids')));
    const galleryId = asString(form.get('gallery_id'));
    if (!photoIds.length)
      return fail(400, { message: 'Select at least one photo.' });

    let photosQuery = locals.supabase
      .from('photos')
      .select('id, title, status, deleted_at')
      .in('id', photoIds);
    if (galleryId) {
      photosQuery = photosQuery.eq('gallery_id', galleryId);
    }

    const [photosResult, leadsResult] = await Promise.all([
      photosQuery,
      locals.supabase
        .from('photo_images')
        .select('photo_id, delivery_storage_path')
        .in('photo_id', photoIds)
        .eq('kind', 'lead'),
    ]);
    const { data: photos, error: photosError } = photosResult;
    const { data: leads, error: leadsError } = leadsResult;

    if (photosError) return fail(400, { message: photosError.message });
    if (leadsError) return fail(400, { message: leadsError.message });

    const leadByPhotoId = new Map(
      (leads ?? []).map((row) => [row.photo_id, row]),
    );
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
        message:
          'No selected photos are publishable. Publish requires a title and a converted lead image.',
      });
    }

    let updateQuery = locals.supabase
      .from('photos')
      .update({ status: 'published', deleted_at: null })
      .in('id', publishable);
    if (galleryId) updateQuery = updateQuery.eq('gallery_id', galleryId);
    const { error } = await updateQuery;

    if (error) return fail(400, { message: error.message });

    const skipped = photoIds.length - publishable.length;
    return {
      success: true,
      message:
        skipped > 0
          ? `Published ${publishable.length} photo(s). Skipped ${skipped} (missing title/lead image readiness or archived).`
          : `Published ${publishable.length} photo(s).`,
    };
  },

  bulkArchivePhotos: async ({ locals, request }) => {
    const form = await request.formData();
    const photoIds = parseUuidList(asString(form.get('selected_photo_ids')));
    const galleryId = asString(form.get('gallery_id'));
    if (!photoIds.length)
      return fail(400, { message: 'Select at least one photo.' });

    let query = locals.supabase
      .from('photos')
      .update({ status: 'archived', deleted_at: new Date().toISOString() })
      .in('id', photoIds);
    if (galleryId) query = query.eq('gallery_id', galleryId);
    const { error } = await query;

    if (error) return fail(400, { message: error.message });
    return { success: true, message: `Archived ${photoIds.length} photo(s).` };
  },

  bulkRestorePhotos: async ({ locals, request }) => {
    const form = await request.formData();
    const photoIds = parseUuidList(asString(form.get('selected_photo_ids')));
    const galleryId = asString(form.get('gallery_id'));
    if (!photoIds.length)
      return fail(400, { message: 'Select at least one photo.' });

    let query = locals.supabase
      .from('photos')
      .update({ status: 'draft', deleted_at: null })
      .in('id', photoIds);
    if (galleryId) query = query.eq('gallery_id', galleryId);
    const { error } = await query;

    if (error) return fail(400, { message: error.message });
    return {
      success: true,
      message: `Restored ${photoIds.length} photo(s) to draft.`,
    };
  },

  bulkDeletePhotos: async ({ locals, request }) => {
    const form = await request.formData();
    const galleryId = asString(form.get('gallery_id'));
    if (asString(form.get('showArchived')) !== '1') {
      return fail(400, {
        message: 'Delete is only allowed when viewing archived photos.',
      });
    }
    const photoIds = parseUuidList(asString(form.get('selected_photo_ids')));
    if (!photoIds.length)
      return fail(400, { message: 'Select at least one photo.' });

    let photosQuery = locals.supabase
      .from('photos')
      .select('id, status, deleted_at')
      .in('id', photoIds);
    if (galleryId) photosQuery = photosQuery.eq('gallery_id', galleryId);
    const { data: photos, error: photosError } = await photosQuery;

    if (photosError) return fail(400, { message: photosError.message });
    const notArchived = (photos ?? []).filter(
      (p: { status: string; deleted_at: string | null }) =>
        p.status !== 'archived' || p.deleted_at == null,
    );
    if (notArchived.length > 0) {
      return fail(400, {
        message: 'Only archived photos can be permanently deleted.',
      });
    }

    const imagesQuery = locals.supabase
      .from('photo_images')
      .select('source_storage_path, delivery_storage_path')
      .in('photo_id', photoIds);
    const { data: images, error: imagesError } = await imagesQuery;

    if (imagesError) return fail(400, { message: imagesError.message });

    const pathsToRemove = (images ?? []).flatMap(
      (row: {
        source_storage_path: string;
        delivery_storage_path: string | null;
      }) =>
        [row.source_storage_path, row.delivery_storage_path].filter(Boolean),
    ) as string[];
    if (pathsToRemove.length > 0) {
      const { error: storageError } = await locals.supabase.storage
        .from('photos')
        .remove(pathsToRemove);
      if (storageError) return fail(400, { message: storageError.message });
    }

    let deleteQuery = locals.supabase
      .from('photos')
      .delete()
      .in('id', photoIds);
    if (galleryId) deleteQuery = deleteQuery.eq('gallery_id', galleryId);
    const { error: deleteError } = await deleteQuery;
    if (deleteError) return fail(400, { message: deleteError.message });
    return {
      success: true,
      message: `Deleted ${photoIds.length} photo(s) and their files.`,
    };
  },

  reorderPhotos: async ({ locals, request }) => {
    const form = await request.formData();
    const orderedIds = parseUuidList(asString(form.get('ordered_photo_ids')));
    const galleryId = asString(form.get('gallery_id'));
    if (!orderedIds.length)
      return fail(400, { message: 'No photo IDs provided.' });

    if (!galleryId) {
      return fail(400, { message: 'Reorder requires a gallery scope.' });
    }

    const { error } = await locals.supabase.rpc('reorder_gallery_photos', {
      p_gallery_id: galleryId,
      p_ordered_photo_ids: orderedIds,
    });
    if (error) return fail(400, { message: error.message });

    return { success: true, message: 'Photo order saved.' };
  },

  bulkMovePhotos: async ({ locals, request }) => {
    const form = await request.formData();
    const photoIds = parseUuidList(asString(form.get('selected_photo_ids')));
    const destinationGalleryId = asString(form.get('destination_gallery_id'));
    if (!photoIds.length) {
      return fail(400, { message: 'Select at least one photo.' });
    }
    if (!destinationGalleryId) {
      return fail(400, { message: 'Choose a destination gallery.' });
    }

    try {
      const result = await movePhotosToGalleryWithAutoSuffix(
        locals,
        photoIds,
        destinationGalleryId,
      );
      const suffixCount = result.suffixed.length;
      const collisionPreview = result.suffixed
        .slice(0, 5)
        .map((item) => `${item.fromSlug} -> ${item.toSlug}`)
        .join(', ');
      return {
        success: true,
        message:
          suffixCount > 0
            ? `Moved ${result.moved} photo(s) (${result.updated} updated). Auto-suffixed ${suffixCount} slug conflict(s): ${collisionPreview}${suffixCount > 5 ? ', ...' : ''}`
            : `Moved ${result.moved} photo(s) (${result.updated} updated).`,
      };
    } catch (cause) {
      return fail(400, {
        message:
          cause instanceof Error ? cause.message : 'Failed to move photos.',
      });
    }
  },
};
