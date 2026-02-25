import { fail, type Actions } from '@sveltejs/kit';
import { asString, parseUuidList } from '$lib/server/admin-helpers';
import { isUuid } from '$lib/server/admin/photos/shared';

export const photoTaxonomyActions: Actions = {
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
  }
};

