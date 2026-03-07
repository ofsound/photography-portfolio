import { fail, type Actions } from '@sveltejs/kit';
import {
  asBoolean,
  asString,
  assertTitle,
  toSlug,
} from '$lib/server/admin-helpers';
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

  return { categories: categoriesQuery.data ?? [] };
};

export const actions: Actions = {
  create: async ({ locals, request }) => {
    const form = await request.formData();
    const name = asString(form.get('name')).trim();
    const slugInput = asString(form.get('slug')).trim();
    const description = asString(form.get('description')).trim() || null;
    const isActive = asBoolean(form.get('is_active'));

    const titleError = assertTitle(name);
    if (titleError) return fail(400, { message: titleError });

    const slug = toSlug(slugInput || name, 'category');

    const { error } = await locals.supabase.from('categories').insert({
      name,
      slug,
      description,
      is_active: isActive,
    });

    if (error) {
      return fail(400, { message: error.message });
    }

    return { success: true, message: 'Category created.' };
  },

  update: async ({ locals, request }) => {
    const form = await request.formData();
    const id = asString(form.get('id'));
    const name = asString(form.get('name')).trim();
    const slugInput = asString(form.get('slug')).trim();
    const description = asString(form.get('description')).trim() || null;
    const isActive = asBoolean(form.get('is_active'));

    if (!id) {
      return fail(400, { message: 'Missing category id.' });
    }

    const titleError = assertTitle(name);
    if (titleError) return fail(400, { message: titleError });

    const slug = toSlug(slugInput || name, 'category');

    const { error } = await locals.supabase
      .from('categories')
      .update({
        name,
        slug,
        description,
        is_active: isActive,
      })
      .eq('id', id);

    if (error) {
      return fail(400, { message: error.message });
    }

    return { success: true, message: 'Category updated.' };
  },

  remove: async ({ locals, request }) => {
    const form = await request.formData();
    const id = asString(form.get('id'));

    if (!id) {
      return fail(400, { message: 'Missing category id.' });
    }

    const { error } = await locals.supabase
      .from('categories')
      .delete()
      .eq('id', id);

    if (error) {
      return fail(400, { message: error.message });
    }

    return { success: true, message: 'Category removed.' };
  },
};
