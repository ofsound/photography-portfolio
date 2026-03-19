import { redirect, type Actions } from '@sveltejs/kit';
import { superValidate, message } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';

import { toSlug } from '$lib/server/admin-helpers';
import {
	photoCreateSchema,
	photoUpdateSchema,
	photoStatusSchema,
} from '$lib/schemas/photo';

type MinimalDraftSeed = {
	title?: string;
	slug?: string;
	galleryId?: string;
};

const draftStatusMigrationHint =
	'Database schema is missing draft photo status. Apply migration 20260302_photo_draft_status.sql and retry.';

const normalizeDraftStatusErrorMessage = (message: string) =>
	message.includes('invalid input value for enum publish_status') &&
		message.includes('"draft"')
		? draftStatusMigrationHint
		: message;

export async function createMinimalDraftPhoto(
	locals: App.Locals,
	seed: MinimalDraftSeed = {},
): Promise<{ id: string }> {
	if (!seed.galleryId) {
		throw new Error('Missing gallery scope for draft creation.');
	}
	const galleryId = seed.galleryId;

	const fallbackTitle = 'New Photo';
	const title = seed.title?.trim() || fallbackTitle;
	const slugBase = toSlug(seed.slug?.trim() || title, 'photo');
	const makeSlug = (withSuffix: boolean) =>
		withSuffix
			? `${slugBase}-${Math.random().toString(36).slice(2, 8)}`
			: slugBase;

	const insertDraft = async (slug: string) =>
		locals.supabase
			.from('photos')
			.insert({
				gallery_id: galleryId,
				title,
				slug,
				capture_date: null,
				description: null,
				dimensions: null,
				license_text: null,
				seo_title: null,
				seo_description: null,
				og_title: null,
				og_description: null,
				og_image_path: null,
				status: 'draft',
				deleted_at: null,
			})
			.select('id')
			.single();

	let insertResult = await insertDraft(makeSlug(false));

	if (insertResult.error?.code === '23505') {
		insertResult = await insertDraft(makeSlug(true));
	}

	if (insertResult.error || !insertResult.data) {
		throw new Error(
			normalizeDraftStatusErrorMessage(
				insertResult.error?.message ?? 'Failed to create draft photo.',
			),
		);
	}
	return { id: insertResult.data.id };
}

type PhotoPayload = {
	title: string;
	slug: string;
	capture_date: string | null;
	description: string | null;
	dimensions: string | null;
	license_text: string | null;
	seo_title: string | null;
	seo_description: string | null;
	og_title: string | null;
	og_description: string | null;
	og_image_path: string | null;
};

const buildPhotoPayload = (data: {
	title: string;
	slug: string;
	capture_date: string;
	description: string;
	dimensions: string;
	license_text: string;
	seo_title: string;
	seo_description: string;
	og_title: string;
	og_description: string;
	og_image_path: string;
}): PhotoPayload => ({
	title: data.title,
	slug: toSlug(data.slug || data.title, 'photo'),
	capture_date: data.capture_date || null,
	description: data.description || null,
	dimensions: data.dimensions || null,
	license_text: data.license_text || null,
	seo_title: data.seo_title || null,
	seo_description: data.seo_description || null,
	og_title: data.og_title || null,
	og_description: data.og_description || null,
	og_image_path: data.og_image_path || null,
});

export const photoCoreActions: Actions = {
	create: async ({ locals, request }) => {
		const form = await superValidate(request, zod4(photoCreateSchema));
		if (!form.valid) {
			const firstError =
				form.errors.gallery_id?.[0] ??
				form.errors.title?.[0] ??
				'Validation failed.';
			return message(form, firstError, { status: 400 });
		}

		const payload = buildPhotoPayload(form.data);

		const { error } = await locals.supabase.from('photos').insert({
			gallery_id: form.data.gallery_id,
			...payload,
			status: 'draft',
			deleted_at: null,
		});

		if (error)
			return message(form, normalizeDraftStatusErrorMessage(error.message), {
				status: 400,
			});
		return message(form, 'Draft created.');
	},

	update: async ({ locals, params, request }) => {
		const form = await superValidate(request, zod4(photoUpdateSchema));
		if (!form.valid) {
			const firstError =
				form.errors.id?.[0] ?? form.errors.title?.[0] ?? 'Validation failed.';
			return message(form, firstError, { status: 400 });
		}

		const { id, gallery_id: galleryId, redirect_to_gallery } = form.data;
		const payload = buildPhotoPayload(form.data);

		let query = locals.supabase
			.from('photos')
			.update({ ...payload, updated_at: new Date().toISOString() })
			.eq('id', id);
		if (galleryId) query = query.eq('gallery_id', galleryId);
		const { error } = await query;

		if (error) return message(form, error.message, { status: 400 });
		if (redirect_to_gallery === '1' && params?.gallerySlug) {
			throw redirect(303, `/admin/${params.gallerySlug}/photos`);
		}
		return message(form, 'Photo updated.');
	},

	archive: async ({ locals, params, request }) => {
		const form = await superValidate(request, zod4(photoStatusSchema));
		if (!form.valid) {
			return message(form, 'Missing photo id.', { status: 400 });
		}

		const { id, gallery_id: galleryId } = form.data;
		let query = locals.supabase
			.from('photos')
			.update({
				status: 'archived',
				deleted_at: new Date().toISOString(),
			})
			.eq('id', id);
		if (galleryId) query = query.eq('gallery_id', galleryId);
		const { error } = await query;

		if (error) return message(form, error.message, { status: 400 });
		if (params?.gallerySlug) {
			throw redirect(303, `/admin/${params.gallerySlug}/photos`);
		}
		return message(form, 'Photo archived.');
	},

	publish: async ({ locals, request }) => {
		const form = await superValidate(request, zod4(photoStatusSchema));
		if (!form.valid) {
			return message(form, 'Missing photo id.', { status: 400 });
		}

		const { id, gallery_id: galleryId } = form.data;

		let photoQuery = locals.supabase
			.from('photos')
			.select('id, title, status, deleted_at')
			.eq('id', id);
		if (galleryId) photoQuery = photoQuery.eq('gallery_id', galleryId);
		const { data: photo, error: photoError } = await photoQuery.maybeSingle();
		if (photoError) return message(form, photoError.message, { status: 400 });
		if (!photo) return message(form, 'Photo not found.', { status: 404 });
		if (photo.status === 'archived' || photo.deleted_at) {
			return message(form, 'Restore this photo to draft before publishing.', {
				status: 400,
			});
		}
		if (!photo.title.trim())
			return message(form, 'Title is required before publishing.', {
				status: 400,
			});

		const { data: lead, error: leadError } = await locals.supabase
			.from('photo_images')
			.select('id, delivery_storage_path')
			.eq('photo_id', id)
			.eq('kind', 'lead')
			.maybeSingle();

		if (leadError) return message(form, leadError.message, { status: 400 });
		if (!lead)
			return message(form, 'Set a lead image before publishing.', {
				status: 400,
			});
		if (!lead.delivery_storage_path) {
			return message(
				form,
				'Lead image is still processing. Wait until conversion finishes.',
				{ status: 400 },
			);
		}

		let updateQuery = locals.supabase
			.from('photos')
			.update({
				status: 'published',
				deleted_at: null,
				updated_at: new Date().toISOString(),
			})
			.eq('id', id);
		if (galleryId) updateQuery = updateQuery.eq('gallery_id', galleryId);
		const { error } = await updateQuery;

		if (error) return message(form, error.message, { status: 400 });
		return message(form, 'Photo published.');
	},

	restore: async ({ locals, request }) => {
		const form = await superValidate(request, zod4(photoStatusSchema));
		if (!form.valid) {
			return message(form, 'Missing photo id.', { status: 400 });
		}

		const { id, gallery_id: galleryId } = form.data;
		let query = locals.supabase
			.from('photos')
			.update({ status: 'draft', deleted_at: null })
			.eq('id', id);
		if (galleryId) query = query.eq('gallery_id', galleryId);
		const { error } = await query;

		if (error) return message(form, error.message, { status: 400 });
		return message(form, 'Photo restored to draft.');
	},
};
