import { fail, type Actions } from '@sveltejs/kit';
import { asBoolean, asOptionalNumber, asString, assertTitle, toSlug } from '$lib/server/admin-helpers';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
  const { data: categories } = await locals.supabase
    .from('categories')
    .select('id, slug, name, description, sort_order, is_active, updated_at')
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true });

  return { categories: categories ?? [] };
};

export const actions: Actions = {
  create: async ({ locals, request }) => {
    const form = await request.formData();
    const name = asString(form.get('name')).trim();
    const slugInput = asString(form.get('slug')).trim();
    const description = asString(form.get('description')).trim() || null;
    const sortOrder = asOptionalNumber(form.get('sort_order')) ?? 0;
    const isActive = asBoolean(form.get('is_active'));

    const titleError = assertTitle(name);
    if (titleError) return fail(400, { message: titleError });

    const slug = toSlug(slugInput || name, 'category');

    const { error } = await locals.supabase.from('categories').insert({
      name,
      slug,
      description,
      sort_order: sortOrder,
      is_active: isActive
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
    const sortOrder = asOptionalNumber(form.get('sort_order')) ?? 0;
    const isActive = asBoolean(form.get('is_active'));

    if (!id) {
      return fail(400, { message: 'Missing category id.' });
    }

    const titleError = assertTitle(name);
    if (titleError) return fail(400, { message: titleError });

    const slug = toSlug(slugInput || name, 'category');

    const { error } = await locals.supabase
      .from('categories')
      .update({ name, slug, description, sort_order: sortOrder, is_active: isActive })
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

    const { error } = await locals.supabase.from('categories').delete().eq('id', id);

    if (error) {
      return fail(400, { message: error.message });
    }

    return { success: true, message: 'Category removed.' };
  }
};
