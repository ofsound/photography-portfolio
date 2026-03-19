import type { Actions } from '@sveltejs/kit';
import { superValidate, message } from 'sveltekit-superforms/server';
import { zod4 } from 'sveltekit-superforms/adapters';

import { toSlug } from '$lib/server/admin-helpers';
import {
  tagCreateSchema,
  tagUpdateSchema,
  tagRemoveSchema,
} from '$lib/schemas/tag';
import { throwLoaderError } from '$lib/server/load-error';

import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
  const tagsQuery = await locals.supabase
    .from('tags')
    .select('id, slug, name, description, is_active, updated_at')
    .order('name', { ascending: true });

  if (tagsQuery.error) {
    throwLoaderError(
      { route: '/admin/tags', operation: 'load tags' },
      tagsQuery.error,
    );
  }

  const [createForm, updateForm, removeForm] = await Promise.all([
    superValidate(zod4(tagCreateSchema)),
    superValidate(zod4(tagUpdateSchema)),
    superValidate(zod4(tagRemoveSchema)),
  ]);

  return { tags: tagsQuery.data ?? [], createForm, updateForm, removeForm };
};

export const actions: Actions = {
  create: async ({ locals, request }) => {
    const form = await superValidate(request, zod4(tagCreateSchema));
    if (!form.valid) {
      return message(form, 'Title/name is required.', { status: 400 });
    }

    const { name, slug: slugInput, description, is_active } = form.data;
    const slug = toSlug(slugInput || name, 'tag');

    const { error } = await locals.supabase.from('tags').insert({
      name,
      slug,
      description: description || null,
      is_active,
    });

    if (error) {
      return message(form, error.message, { status: 400 });
    }

    return message(form, 'Tag created.');
  },

  update: async ({ locals, request }) => {
    const form = await superValidate(request, zod4(tagUpdateSchema));
    if (!form.valid) {
      const firstError =
        form.errors.id?.[0] ?? form.errors.name?.[0] ?? 'Validation failed.';
      return message(form, firstError, { status: 400 });
    }

    const { id, name, slug: slugInput, description, is_active } = form.data;
    const slug = toSlug(slugInput || name, 'tag');

    const { error } = await locals.supabase
      .from('tags')
      .update({ name, slug, description: description || null, is_active })
      .eq('id', id);

    if (error) {
      return message(form, error.message, { status: 400 });
    }

    return message(form, 'Tag updated.');
  },

  remove: async ({ locals, request }) => {
    const form = await superValidate(request, zod4(tagRemoveSchema));
    if (!form.valid) {
      return message(form, 'Missing tag id.', { status: 400 });
    }

    const { error } = await locals.supabase
      .from('tags')
      .delete()
      .eq('id', form.data.id);

    if (error) {
      return message(form, error.message, { status: 400 });
    }

    return message(form, 'Tag removed.');
  },
};
