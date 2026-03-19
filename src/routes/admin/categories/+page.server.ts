import type { Actions } from '@sveltejs/kit';
import { superValidate, message } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';

import { toSlug } from '$lib/server/admin-helpers';
import {
	categoryCreateSchema,
	categoryUpdateSchema,
	categoryRemoveSchema,
} from '$lib/schemas/category';
import { throwLoaderError } from '$lib/server/load-error';

import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const categoriesQuery = await locals.supabase
		.from('categories')
		.select('id, slug, name, description, is_active, updated_at')
		.order('name', { ascending: true });

	if (categoriesQuery.error) {
		throwLoaderError(
			{ route: '/admin/categories', operation: 'load categories' },
			categoriesQuery.error,
		);
	}

	const [createForm, updateForm, removeForm] = await Promise.all([
		superValidate(zod4(categoryCreateSchema)),
		superValidate(zod4(categoryUpdateSchema)),
		superValidate(zod4(categoryRemoveSchema)),
	]);

	return {
		categories: categoriesQuery.data ?? [],
		createForm,
		updateForm,
		removeForm,
	};
};

export const actions: Actions = {
	create: async ({ locals, request }) => {
		const form = await superValidate(request, zod4(categoryCreateSchema));
		if (!form.valid) {
			return message(form, 'Title/name is required.', { status: 400 });
		}

		const { name, slug: slugInput, description, is_active } = form.data;
		const slug = toSlug(slugInput || name, 'category');

		const { error } = await locals.supabase.from('categories').insert({
			name,
			slug,
			description: description || null,
			is_active,
		});

		if (error) {
			return message(form, error.message, { status: 400 });
		}

		return message(form, 'Category created.');
	},

	update: async ({ locals, request }) => {
		const form = await superValidate(request, zod4(categoryUpdateSchema));
		if (!form.valid) {
			const firstError =
				form.errors.id?.[0] ?? form.errors.name?.[0] ?? 'Validation failed.';
			return message(form, firstError, { status: 400 });
		}

		const { id, name, slug: slugInput, description, is_active } = form.data;
		const slug = toSlug(slugInput || name, 'category');

		const { error } = await locals.supabase
			.from('categories')
			.update({
				name,
				slug,
				description: description || null,
				is_active,
			})
			.eq('id', id);

		if (error) {
			return message(form, error.message, { status: 400 });
		}

		return message(form, 'Category updated.');
	},

	remove: async ({ locals, request }) => {
		const form = await superValidate(request, zod4(categoryRemoveSchema));
		if (!form.valid) {
			return message(form, 'Missing category id.', { status: 400 });
		}

		const { error } = await locals.supabase
			.from('categories')
			.delete()
			.eq('id', form.data.id);

		if (error) {
			return message(form, error.message, { status: 400 });
		}

		return message(form, 'Category removed.');
	},
};
