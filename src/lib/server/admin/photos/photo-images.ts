import { fail, type Actions } from '@sveltejs/kit';
import {
  allowedUploadMimes,
  asOptionalNumber,
  asString,
  mimeToExtension,
  parseUuidList,
  storageSourcePath
} from '$lib/server/admin-helpers';
import { normalizePhotoImagePositions } from '$lib/server/admin/photos/shared';

export const photoImageActions: Actions = {
  reorderAdditionalImages: async ({ locals, request }) => {
    const form = await request.formData();
    const photoId = asString(form.get('photo_id'));
    const orderedImageIds = parseUuidList(asString(form.get('ordered_image_ids')));

    if (!photoId) return fail(400, { message: 'Missing photo id.' });

    const { data: images, error: loadError } = await locals.supabase
      .from('photo_images')
      .select('id, kind, position')
      .eq('photo_id', photoId)
      .order('position', { ascending: true });

    if (loadError || !images) return fail(400, { message: loadError?.message ?? 'Failed to load images.' });

    const lead = images.find((image) => image.kind === 'lead') ?? null;
    const additional = images.filter((image) => image.kind === 'additional');
    const additionalIds = new Set(additional.map((image) => image.id));

    const submitted = orderedImageIds.filter((id) => additionalIds.has(id));
    const remaining = additional.map((image) => image.id).filter((id) => !submitted.includes(id));
    const finalOrder = [...submitted, ...remaining];

    const stagedUpdates = images.map((image, idx) =>
      locals.supabase.from('photo_images').update({ position: 100000 + idx }).eq('id', image.id).eq('photo_id', photoId)
    );

    const stagedResults = await Promise.all(stagedUpdates);
    const stagedError = stagedResults.find((result) => result.error)?.error;
    if (stagedError) return fail(400, { message: stagedError.message });

    const finalWrites: PromiseLike<{ error: { message: string } | null }>[] = [];

    if (lead) {
      finalWrites.push(locals.supabase.from('photo_images').update({ position: 0 }).eq('id', lead.id).eq('photo_id', photoId));
    }

    finalOrder.forEach((id, index) => {
      const nextPosition = (lead ? 1 : 0) + index;
      finalWrites.push(locals.supabase.from('photo_images').update({ position: nextPosition }).eq('id', id).eq('photo_id', photoId));
    });

    const finalResults = await Promise.all(finalWrites);
    const finalError = finalResults.find((result) => result.error)?.error;
    if (finalError) return fail(400, { message: finalError.message });

    return { success: true, message: 'Additional image order saved.' };
  },

  uploadImage: async ({ locals, request }) => {
    const form = await request.formData();
    const photoId = asString(form.get('photo_id'));
    const kind = asString(form.get('kind'), 'additional') as 'lead' | 'additional';
    const altText = asString(form.get('alt_text')).trim() || null;
    const imageFile = form.get('image_file');

    if (!photoId) return fail(400, { message: 'Missing photo id.' });
    if (!(imageFile instanceof File) || !imageFile.size) {
      return fail(400, { message: 'Select an image file.' });
    }

    const mimeType = imageFile.type || 'image/jpeg';
    if (!allowedUploadMimes.has(mimeType)) {
      return fail(400, { message: `Unsupported image type: ${mimeType}` });
    }

    const ext = mimeToExtension(mimeType);
    const filename = imageFile.name?.includes('.') ? imageFile.name : `upload.${ext}`;
    const sourcePath = storageSourcePath(photoId, filename);

    const { data: lastImage } = await locals.supabase
      .from('photo_images')
      .select('position')
      .eq('photo_id', photoId)
      .order('position', { ascending: false })
      .limit(1)
      .maybeSingle();

    const nextPosition = (lastImage?.position ?? -1) + 1;

    const { error: uploadError } = await locals.supabase.storage.from('photos').upload(sourcePath, imageFile, {
      contentType: mimeType,
      upsert: false
    });

    if (uploadError) {
      return fail(400, { message: uploadError.message });
    }

    const { error: rowError } = await locals.supabase.rpc('insert_photo_image', {
      p_photo_id: photoId,
      p_source_path: sourcePath,
      p_source_mime: mimeType,
      p_source_bytes: imageFile.size,
      p_kind: kind,
      p_position: nextPosition,
      p_alt_text: altText
    });

    if (rowError) {
      await locals.supabase.storage.from('photos').remove([sourcePath]);
      return fail(400, { message: rowError.message });
    }

    return { success: true, message: 'Image uploaded. Conversion runs asynchronously.' };
  },

  setLead: async ({ locals, request }) => {
    const form = await request.formData();
    const photoId = asString(form.get('photo_id'));
    const imageId = asString(form.get('image_id'));

    if (!photoId || !imageId) return fail(400, { message: 'Missing image or photo id.' });

    const { error } = await locals.supabase.rpc('set_lead_image', {
      p_photo_id: photoId,
      p_image_id: imageId
    });

    if (error) return fail(400, { message: error.message });

    return { success: true, message: 'Lead image updated.' };
  },

  removeImage: async ({ locals, request }) => {
    const form = await request.formData();
    const imageId = asString(form.get('image_id'));

    const { data: image, error: imageError } = await locals.supabase
      .from('photo_images')
      .select('id, photo_id, kind, source_storage_path, delivery_storage_path')
      .eq('id', imageId)
      .maybeSingle();

    if (imageError || !image) return fail(404, { message: 'Image not found.' });

    const { error: deleteError } = await locals.supabase.from('photo_images').delete().eq('id', imageId);
    if (deleteError) return fail(400, { message: deleteError.message });

    const pathsToRemove = [image.source_storage_path, image.delivery_storage_path].filter(Boolean) as string[];
    if (pathsToRemove.length) {
      await locals.supabase.storage.from('photos').remove(pathsToRemove);
    }

    if (image.kind === 'lead') {
      const { data: replacement } = await locals.supabase
        .from('photo_images')
        .select('id')
        .eq('photo_id', image.photo_id)
        .order('position', { ascending: true })
        .limit(1)
        .maybeSingle();

      if (replacement) {
        await locals.supabase.from('photo_images').update({ kind: 'lead' }).eq('id', replacement.id);
      }
    }

    const normalizeResult = await normalizePhotoImagePositions(locals, image.photo_id);
    if (!normalizeResult.ok) {
      return fail(400, { message: normalizeResult.message });
    }

    return { success: true, message: 'Image removed.' };
  },

  saveThumbCrop: async ({ locals, request }) => {
    const form = await request.formData();
    const photoId = asString(form.get('photo_id'));
    const imageId = asString(form.get('image_id'));
    const cropX = asOptionalNumber(form.get('thumb_crop_x'));
    const cropY = asOptionalNumber(form.get('thumb_crop_y'));
    const cropZoom = asOptionalNumber(form.get('thumb_crop_zoom'));

    if (!photoId || !imageId) return fail(400, { message: 'Missing photo or image id.' });

    const { data: image, error: loadError } = await locals.supabase
      .from('photo_images')
      .select('id, kind')
      .eq('id', imageId)
      .eq('photo_id', photoId)
      .maybeSingle();

    if (loadError || !image) return fail(404, { message: 'Image not found.' });
    if (image.kind !== 'lead') return fail(400, { message: 'Thumbnail crop applies only to lead images.' });

    const updates: Record<string, number | null> = {};
    if (cropX != null && cropX >= 0 && cropX <= 1) updates.thumb_crop_x = cropX;
    if (cropY != null && cropY >= 0 && cropY <= 1) updates.thumb_crop_y = cropY;
    if (cropZoom != null && cropZoom >= 1) updates.thumb_crop_zoom = cropZoom;

    const { error: updateError } = await locals.supabase
      .from('photo_images')
      .update(updates)
      .eq('id', imageId)
      .eq('photo_id', photoId);

    if (updateError) return fail(400, { message: updateError.message });

    return { success: true, message: 'Thumbnail crop saved.' };
  },

  clearThumbCrop: async ({ locals, request }) => {
    const form = await request.formData();
    const photoId = asString(form.get('photo_id'));
    const imageId = asString(form.get('image_id'));

    if (!photoId || !imageId) return fail(400, { message: 'Missing photo or image id.' });

    const { data: image, error: loadError } = await locals.supabase
      .from('photo_images')
      .select('id, kind')
      .eq('id', imageId)
      .eq('photo_id', photoId)
      .maybeSingle();

    if (loadError || !image) return fail(404, { message: 'Image not found.' });
    if (image.kind !== 'lead') return fail(400, { message: 'Thumbnail crop applies only to lead images.' });

    const { error: updateError } = await locals.supabase
      .from('photo_images')
      .update({ thumb_crop_x: null, thumb_crop_y: null, thumb_crop_zoom: null })
      .eq('id', imageId)
      .eq('photo_id', photoId);

    if (updateError) return fail(400, { message: updateError.message });

    return { success: true, message: 'Thumbnail crop cleared.' };
  }
};

