import { fail, type Actions } from '@sveltejs/kit';
import { superValidate, message } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';

import { parseUuidList } from '$lib/server/admin-helpers';
import { isUuid } from '$lib/server/admin/photos/shared';
import {
	bulkAssignTaxonomySchema,
	saveRelationsSchema,
} from '$lib/schemas/photo';

export const photoTaxonomyActions: Actions = {
	bulkAssignTaxonomy: async ({ locals, request }) => {
		const form = await superValidate(request, zod4(bulkAssignTaxonomySchema));
		if (!form.valid) {
			return message(form, 'Validation failed.', { status: 400 });
		}

		const photoIds = parseUuidList(form.data.selected_photo_ids);
		const galleryId = form.data.gallery_id;
		const rawCategoryIds = form.data.category_ids;
		const rawTagIds = form.data.tag_ids;
		const categoryIds = (
			Array.isArray(rawCategoryIds) ? rawCategoryIds : [rawCategoryIds]
		).filter((value) => isUuid(value));
		const tagIds = (Array.isArray(rawTagIds) ? rawTagIds : [rawTagIds]).filter(
			(value) => isUuid(value),
		);

		if (!photoIds.length)
			return fail(400, { message: 'Select at least one photo.' });

		if (galleryId) {
			const guard = await locals.supabase
				.from('photos')
				.select('id')
				.eq('gallery_id', galleryId)
				.in('id', photoIds);
			if (guard.error) return fail(400, { message: guard.error.message });
			if ((guard.data ?? []).length !== photoIds.length) {
				return fail(400, {
					message: 'Some selected photos are outside this gallery.',
				});
			}
		}
		if (!categoryIds.length && !tagIds.length) {
			return fail(400, { message: 'Select categories and/or tags to add.' });
		}

		if (categoryIds.length) {
			const { data: existingCats, error: existingCatError } =
				await locals.supabase
					.from('photo_categories')
					.select('photo_id, category_id')
					.in('photo_id', photoIds)
					.in('category_id', categoryIds);
			if (existingCatError)
				return fail(400, { message: existingCatError.message });

			const existingSet = new Set(
				(existingCats ?? []).map((row) => `${row.photo_id}:${row.category_id}`),
			);
			const payload = photoIds.flatMap((photoId) =>
				categoryIds
					.filter((categoryId) => !existingSet.has(`${photoId}:${categoryId}`))
					.map((categoryId) => ({
						photo_id: photoId,
						category_id: categoryId,
					})),
			);

			if (payload.length) {
				const { error } = await locals.supabase
					.from('photo_categories')
					.insert(payload);
				if (error) return fail(400, { message: error.message });
			}
		}

		if (tagIds.length) {
			const { data: existingTags, error: existingTagError } =
				await locals.supabase
					.from('photo_tags')
					.select('photo_id, tag_id')
					.in('photo_id', photoIds)
					.in('tag_id', tagIds);
			if (existingTagError)
				return fail(400, { message: existingTagError.message });

			const existingSet = new Set(
				(existingTags ?? []).map((row) => `${row.photo_id}:${row.tag_id}`),
			);
			const payload = photoIds.flatMap((photoId) =>
				tagIds
					.filter((tagId) => !existingSet.has(`${photoId}:${tagId}`))
					.map((tagId) => ({ photo_id: photoId, tag_id: tagId })),
			);

			if (payload.length) {
				const { error } = await locals.supabase
					.from('photo_tags')
					.insert(payload);
				if (error) return fail(400, { message: error.message });
			}
		}

		return {
			success: true,
			message: 'Bulk taxonomy applied to selected photos.',
		};
	},

	saveRelations: async ({ locals, request }) => {
		const form = await superValidate(request, zod4(saveRelationsSchema));
		if (!form.valid) {
			return message(form, 'Missing photo id.', { status: 400 });
		}

		const { photo_id: photoId, gallery_id: galleryId } = form.data;
		const rawCategoryIds = form.data.category_ids;
		const rawTagIds = form.data.tag_ids;
		const categoryIds = (
			Array.isArray(rawCategoryIds) ? rawCategoryIds : [rawCategoryIds]
		).filter((id) => isUuid(id));
		const tagIds = (Array.isArray(rawTagIds) ? rawTagIds : [rawTagIds]).filter(
			(id) => isUuid(id),
		);

		if (galleryId) {
			const guard = await locals.supabase
				.from('photos')
				.select('id')
				.eq('id', photoId)
				.eq('gallery_id', galleryId)
				.maybeSingle();
			if (guard.error) return fail(400, { message: guard.error.message });
			if (!guard.data)
				return fail(404, {
					message: 'Photo not found in this gallery.',
				});
		}

		const { error } = await locals.supabase.rpc('save_photo_relations', {
			p_photo_id: photoId,
			p_category_ids: categoryIds,
			p_tag_ids: tagIds,
		});

		if (error) return fail(400, { message: error.message });

		return { success: true, message: 'Photo categories/tags updated.' };
	},
};
