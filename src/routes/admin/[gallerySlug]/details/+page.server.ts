import { error, fail, redirect } from '@sveltejs/kit';
import { superValidate, message } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';

import { getCmsRole } from '$lib/server/admin-helpers';
import {
	deleteGalleryIfEmpty,
	parseGalleryVisibilityStatus,
	resolveGalleryForAdmin,
	updateGalleryWithAutoSlug,
	validateGallerySlugInput,
} from '$lib/server/admin/galleries';
import {
	loadSettingsEditor,
	SettingsValidationError,
	saveSettingsEditor,
} from '$lib/server/admin/settings';
import { galleryDetailsSaveSchema } from '$lib/schemas/gallery';

import type { Actions, PageServerLoad } from './$types';

const resolveScope = async (locals: App.Locals, gallerySlug: string) => {
	const resolved = await resolveGalleryForAdmin(locals, gallerySlug);
	if (resolved.kind === 'redirect') {
		throw redirect(301, `/admin/${resolved.toSlug}/details`);
	}
	if (resolved.kind !== 'gallery') {
		throw error(404, 'Gallery not found.');
	}
	return resolved.gallery;
};

export const load: PageServerLoad = async ({ locals, params }) => {
	const gallery = await resolveScope(locals, params.gallerySlug);
	const payload = await loadSettingsEditor(locals, {
		kind: 'gallery',
		galleryId: gallery.id,
	});

	const saveForm = await superValidate(zod4(galleryDetailsSaveSchema));

	return {
		...payload,
		gallery,
		scopeLabel: `/${gallery.slug}`,
		saveForm,
	};
};

export const actions: Actions = {
	save: async ({ locals, params, request }) => {
		const rawForm = await request.formData();
		const form = await superValidate(rawForm, zod4(galleryDetailsSaveSchema));
		const gallery = await resolveScope(locals, params.gallerySlug);
		const role = await getCmsRole(locals);
		if (!role) {
			return fail(403, { message: 'Unauthorized.' });
		}

		const { name, slug: slugInput } = form.data;

		if (role === 'admin') {
			if (!name) {
				form.errors.name = ['Name is required.'];
				return message(form, 'Name is required.', { status: 400 });
			}

			const slugProblem = validateGallerySlugInput(slugInput || name);
			if (slugProblem) {
				form.errors.slug = [slugProblem];
				return message(form, slugProblem, { status: 400 });
			}
		}

		try {
			await saveSettingsEditor(
				locals,
				{ kind: 'gallery', galleryId: gallery.id },
				rawForm,
			);
		} catch (cause) {
			if (cause instanceof SettingsValidationError) {
				return fail(400, {
					message: cause.message,
					fieldErrors: cause.fieldErrors,
					values: cause.values,
				});
			}
			return fail(400, {
				message:
					cause instanceof Error
						? `Failed to save settings: ${cause.message}`
						: 'Failed to save gallery settings.',
			});
		}

		if (role !== 'admin') {
			return message(form, `Saved details for /${gallery.slug}.`);
		}

		let updated: Awaited<ReturnType<typeof updateGalleryWithAutoSlug>>;
		try {
			const asNullable = (v: string) => (v.length ? v : null);
			updated = await updateGalleryWithAutoSlug(locals, gallery, {
				name,
				slugInput,
				description: asNullable(form.data.description),
				seoTitle: asNullable(form.data.seo_title),
				seoDescription: asNullable(form.data.seo_description),
				ogTitle: asNullable(form.data.og_title),
				ogDescription: asNullable(form.data.og_description),
				ogImagePath: asNullable(form.data.og_image_path),
				navOrder: gallery.nav_order,
				visibilityStatus: parseGalleryVisibilityStatus(
					form.data.visibility_status,
				),
			});
		} catch (cause) {
			return fail(400, {
				message:
					cause instanceof Error
						? `Saved settings, but failed to save details: ${cause.message}`
						: 'Saved settings, but failed to save details.',
			});
		}

		if (updated.slug !== gallery.slug) {
			throw redirect(303, `/admin/${updated.slug}/details`);
		}

		return message(form, `Saved details for /${updated.slug}.`);
	},

	delete: async ({ locals, params }) => {
		const role = await getCmsRole(locals);
		if (role !== 'admin') {
			return fail(403, { message: 'Only admins can delete galleries.' });
		}

		const gallery = await resolveScope(locals, params.gallerySlug);

		try {
			await deleteGalleryIfEmpty(locals, gallery.id);
		} catch (cause) {
			return fail(400, {
				message:
					cause instanceof Error ? cause.message : 'Failed to delete gallery.',
			});
		}

		throw redirect(303, '/admin/galleries');
	},
};
