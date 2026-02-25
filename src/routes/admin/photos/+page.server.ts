import { fail, type Actions } from '@sveltejs/kit';
import {
  allowedUploadMimes,
  asOptionalDate,
  asOptionalNumber,
  asString,
  asBoolean,
  mimeToExtension,
  parseUuidList,
  storageSourcePath,
  toSlug
} from '$lib/server/admin-helpers';
import type { Database } from '$lib/types/database';
import type { PageServerLoad } from './$types';

type PhotoImageRow = Database['public']['Tables']['photo_images']['Row'];

const parseSearch = (q: string) => `%${q.replace(/[%_]/g, '')}%`;

const isUuid = (value: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

const normalizePhotoImagePositions = async (locals: App.Locals, photoId: string) => {
  const { data: images, error: loadError } = await locals.supabase
    .from('photo_images')
    .select('id, kind, position')
    .eq('photo_id', photoId)
    .order('position', { ascending: true });

  if (loadError || !images) {
    return { ok: false as const, message: loadError?.message ?? 'Failed to load images for normalization.' };
  }

  if (!images.length) {
    return { ok: true as const };
  }

  let lead = images.find((image) => image.kind === 'lead') ?? null;
  if (!lead) {
    const first = images[0];
    const { error: promoteError } = await locals.supabase
      .from('photo_images')
      .update({ kind: 'lead' })
      .eq('id', first.id)
      .eq('photo_id', photoId);
    if (promoteError) return { ok: false as const, message: promoteError.message };
    lead = first;
  }

  const additional = images.filter((image) => image.id !== lead?.id).sort((a, b) => a.position - b.position);

  const stagedWrites = images.map((image, idx) =>
    locals.supabase.from('photo_images').update({ position: 100000 + idx }).eq('id', image.id).eq('photo_id', photoId)
  );
  const stagedResults = await Promise.all(stagedWrites);
  const stagedError = stagedResults.find((result) => result.error)?.error;
  if (stagedError) return { ok: false as const, message: stagedError.message };

  const finalWrites: PromiseLike<{ error: { message: string } | null }>[] = [];
  finalWrites.push(locals.supabase.from('photo_images').update({ position: 0 }).eq('id', lead.id).eq('photo_id', photoId));
  additional.forEach((image, index) => {
    finalWrites.push(
      locals.supabase.from('photo_images').update({ position: index + 1, kind: 'additional' }).eq('id', image.id).eq('photo_id', photoId)
    );
  });

  const finalResults = await Promise.all(finalWrites);
  const finalError = finalResults.find((result) => result.error)?.error;
  if (finalError) return { ok: false as const, message: finalError.message };

  return { ok: true as const };
};

export const load: PageServerLoad = async ({ locals, url }) => {
  const showArchived = url.searchParams.get('showArchived') === '1';
  const q = asString(url.searchParams.get('q')).trim();
  const filterCategoryId = isUuid(asString(url.searchParams.get('category'))) ? asString(url.searchParams.get('category')) : '';
  const filterTagId = isUuid(asString(url.searchParams.get('tag'))) ? asString(url.searchParams.get('tag')) : '';
  const requestedConversion = asString(url.searchParams.get('conversion'), 'all');
  const filterConversion = ['all', 'pending', 'ready', 'mixed', 'no-images'].includes(requestedConversion)
    ? requestedConversion
    : 'all';

  let photoQuery = locals.supabase
    .from('photos')
    .select('id, slug, title, capture_date, description, width_px, height_px, license_text, og_title, og_description, og_image_path, status, is_searchable, deleted_at, updated_at')
    .order('updated_at', { ascending: false })
    .limit(120);

  if (!showArchived) {
    photoQuery = photoQuery.is('deleted_at', null);
  }

  if (q) {
    const searchPattern = parseSearch(q);
    photoQuery = photoQuery.or(`title.ilike.${searchPattern},description.ilike.${searchPattern},slug.ilike.${searchPattern}`);
  }

  const [{ data: photos }, { data: categories }, { data: tags }, pendingQuery] = await Promise.all([
    photoQuery,
    locals.supabase.from('categories').select('id, name, slug, is_active').order('name', { ascending: true }),
    locals.supabase.from('tags').select('id, name, slug, is_active').order('name', { ascending: true }),
    locals.supabase
      .from('photo_images')
      .select('id', { count: 'exact', head: true })
      .eq('is_active', true)
      .is('delivery_storage_path', null)
  ]);

  const photoIds = (photos ?? []).map((photo: { id: string }) => photo.id);

  let photoCategories: { photo_id: string; category_id: string }[] = [];
  let photoTags: { photo_id: string; tag_id: string }[] = [];
  let photoImages: PhotoImageRow[] = [];

  if (photoIds.length) {
    const [categoryLinks, tagLinks, images] = await Promise.all([
      locals.supabase.from('photo_categories').select('photo_id, category_id').in('photo_id', photoIds),
      locals.supabase.from('photo_tags').select('photo_id, tag_id').in('photo_id', photoIds),
      locals.supabase
        .from('photo_images')
        .select('id, photo_id, kind, position, source_storage_path, delivery_storage_path, source_mime_type, source_bytes, alt_text, focal_x, focal_y, created_at')
        .in('photo_id', photoIds)
        .order('position', { ascending: true })
    ]);

    photoCategories = categoryLinks.data ?? [];
    photoTags = tagLinks.data ?? [];
    photoImages = (images.data ?? []) as PhotoImageRow[];
  }

  const photoCategoryIds: Record<string, string[]> = {};
  const photoTagIds: Record<string, string[]> = {};
  const photoImageMap: Record<string, PhotoImageRow[]> = {};

  for (const link of photoCategories) {
    if (!photoCategoryIds[link.photo_id]) photoCategoryIds[link.photo_id] = [];
    photoCategoryIds[link.photo_id].push(link.category_id);
  }

  for (const link of photoTags) {
    if (!photoTagIds[link.photo_id]) photoTagIds[link.photo_id] = [];
    photoTagIds[link.photo_id].push(link.tag_id);
  }

  for (const image of photoImages) {
    if (!photoImageMap[image.photo_id]) photoImageMap[image.photo_id] = [];
    photoImageMap[image.photo_id].push(image);
  }

  const photoConversionStateMap: Record<string, 'no-images' | 'pending' | 'ready' | 'mixed'> = {};

  for (const photo of photos ?? []) {
    const images = photoImageMap[photo.id] ?? [];
    const hasReady = images.some((image) => Boolean(image.delivery_storage_path));
    const hasPending = images.some((image) => !image.delivery_storage_path);

    if (!images.length) {
      photoConversionStateMap[photo.id] = 'no-images';
    } else if (hasReady && hasPending) {
      photoConversionStateMap[photo.id] = 'mixed';
    } else if (hasPending) {
      photoConversionStateMap[photo.id] = 'pending';
    } else {
      photoConversionStateMap[photo.id] = 'ready';
    }
  }

  const filteredPhotos = (photos ?? []).filter((photo) => {
    if (filterCategoryId) {
      const categoryIds = photoCategoryIds[photo.id] ?? [];
      if (!categoryIds.includes(filterCategoryId)) return false;
    }

    if (filterTagId) {
      const tagIds = photoTagIds[photo.id] ?? [];
      if (!tagIds.includes(filterTagId)) return false;
    }

    if (filterConversion !== 'all') {
      if (photoConversionStateMap[photo.id] !== filterConversion) return false;
    }

    return true;
  });

  return {
    photos: filteredPhotos,
    categories: categories ?? [],
    tags: tags ?? [],
    photoCategoryIds,
    photoTagIds,
    photoImageMap,
    photoConversionStateMap,
    showArchived,
    q,
    filterCategoryId,
    filterTagId,
    filterConversion,
    pendingConversionCount: pendingQuery.count ?? 0
  };
};

type PhotoPayload = {
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

const upsertPhotoPayload = (form: FormData): { ok: true; payload: PhotoPayload } | { ok: false; message: string } => {
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

export const actions: Actions = {
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
  },

  bulkAssignTaxonomy: async ({ locals, request }) => {
    const form = await request.formData();
    const photoIds = parseUuidList(asString(form.get('selected_photo_ids')));
    const categoryIds = form
      .getAll('category_ids')
      .map((entry) => String(entry))
      .filter((value) => isUuid(value));
    const tagIds = form
      .getAll('tag_ids')
      .map((entry) => String(entry))
      .filter((value) => isUuid(value));

    if (!photoIds.length) return fail(400, { message: 'Select at least one photo.' });
    if (!categoryIds.length && !tagIds.length) {
      return fail(400, { message: 'Select categories and/or tags to add.' });
    }

    if (categoryIds.length) {
      const { data: existingCats, error: existingCatError } = await locals.supabase
        .from('photo_categories')
        .select('photo_id, category_id')
        .in('photo_id', photoIds)
        .in('category_id', categoryIds);
      if (existingCatError) return fail(400, { message: existingCatError.message });

      const existingSet = new Set((existingCats ?? []).map((row) => `${row.photo_id}:${row.category_id}`));
      const payload = photoIds.flatMap((photoId) =>
        categoryIds
          .filter((categoryId) => !existingSet.has(`${photoId}:${categoryId}`))
          .map((categoryId) => ({ photo_id: photoId, category_id: categoryId }))
      );

      if (payload.length) {
        const { error } = await locals.supabase.from('photo_categories').insert(payload);
        if (error) return fail(400, { message: error.message });
      }
    }

    if (tagIds.length) {
      const { data: existingTags, error: existingTagError } = await locals.supabase
        .from('photo_tags')
        .select('photo_id, tag_id')
        .in('photo_id', photoIds)
        .in('tag_id', tagIds);
      if (existingTagError) return fail(400, { message: existingTagError.message });

      const existingSet = new Set((existingTags ?? []).map((row) => `${row.photo_id}:${row.tag_id}`));
      const payload = photoIds.flatMap((photoId) =>
        tagIds.filter((tagId) => !existingSet.has(`${photoId}:${tagId}`)).map((tagId) => ({ photo_id: photoId, tag_id: tagId }))
      );

      if (payload.length) {
        const { error } = await locals.supabase.from('photo_tags').insert(payload);
        if (error) return fail(400, { message: error.message });
      }
    }

    return { success: true, message: 'Bulk taxonomy applied to selected photos.' };
  },

  saveRelations: async ({ locals, request }) => {
    const form = await request.formData();
    const photoId = asString(form.get('photo_id'));
    const categoryIds = form
      .getAll('category_ids')
      .map((item) => String(item))
      .filter((id) => isUuid(id));
    const tagIds = form
      .getAll('tag_ids')
      .map((item) => String(item))
      .filter((id) => isUuid(id));

    if (!photoId) return fail(400, { message: 'Missing photo id.' });

    const { error } = await locals.supabase.rpc('save_photo_relations', {
      p_photo_id: photoId,
      p_category_ids: categoryIds,
      p_tag_ids: tagIds
    });

    if (error) return fail(400, { message: error.message });

    return { success: true, message: 'Photo categories/tags updated.' };
  },

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

    // Stage positions to avoid unique(position) conflicts during reorder writes.
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
    const focalX = asOptionalNumber(form.get('focal_x')) ?? 0.5;
    const focalY = asOptionalNumber(form.get('focal_y')) ?? 0.5;
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
      p_alt_text: altText,
      p_focal_x: focalX,
      p_focal_y: focalY
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

  removeSelectedImages: async ({ locals, request }) => {
    const form = await request.formData();
    const photoId = asString(form.get('photo_id'));
    const imageIds = parseUuidList(asString(form.get('selected_image_ids')));

    if (!photoId) return fail(400, { message: 'Missing photo id.' });
    if (!imageIds.length) return fail(400, { message: 'Select at least one additional image.' });

    const { data: images, error: loadError } = await locals.supabase
      .from('photo_images')
      .select('id, kind, source_storage_path, delivery_storage_path')
      .eq('photo_id', photoId)
      .in('id', imageIds);

    if (loadError || !images) return fail(400, { message: loadError?.message ?? 'Failed to load selected images.' });
    if (!images.length) return fail(400, { message: 'No matching images found.' });
    if (images.some((image) => image.kind === 'lead')) return fail(400, { message: 'Lead image cannot be removed in bulk.' });

    const { error: deleteError } = await locals.supabase.from('photo_images').delete().eq('photo_id', photoId).in('id', imageIds);
    if (deleteError) return fail(400, { message: deleteError.message });

    const storagePaths = images.flatMap((image) => [image.source_storage_path, image.delivery_storage_path].filter(Boolean) as string[]);
    if (storagePaths.length) {
      await locals.supabase.storage.from('photos').remove(storagePaths);
    }

    const normalizeResult = await normalizePhotoImagePositions(locals, photoId);
    if (!normalizeResult.ok) {
      return fail(400, { message: normalizeResult.message });
    }

    return { success: true, message: `Removed ${images.length} selected additional image(s).` };
  }
};
