import { fail, type Actions } from '@sveltejs/kit';
import { asBoolean, asString, assertTitle, toSlug } from '$lib/server/admin-helpers';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
  const { data: tags } = await locals.supabase
    .from('tags')
    .select('id, slug, name, description, is_active, updated_at')
    .order('name', { ascending: true });

  return { tags: tags ?? [] };
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

    const slug = toSlug(slugInput || name, 'tag');

    const { error } = await locals.supabase.from('tags').insert({
      name,
      slug,
      description,
      is_active: isActive
    });

    if (error) {
      return fail(400, { message: error.message });
    }

    return { success: true, message: 'Tag created.' };
  },

  update: async ({ locals, request }) => {
    const form = await request.formData();
    const id = asString(form.get('id'));
    const name = asString(form.get('name')).trim();
    const slugInput = asString(form.get('slug')).trim();
    const description = asString(form.get('description')).trim() || null;
    const isActive = asBoolean(form.get('is_active'));

    if (!id) {
      return fail(400, { message: 'Missing tag id.' });
    }

    const titleError = assertTitle(name);
    if (titleError) return fail(400, { message: titleError });

    const slug = toSlug(slugInput || name, 'tag');

    const { error } = await locals.supabase
      .from('tags')
      .update({ name, slug, description, is_active: isActive })
      .eq('id', id);

    if (error) {
      return fail(400, { message: error.message });
    }

    return { success: true, message: 'Tag updated.' };
  },

  remove: async ({ locals, request }) => {
    const form = await request.formData();
    const id = asString(form.get('id'));

    if (!id) {
      return fail(400, { message: 'Missing tag id.' });
    }

    const { error } = await locals.supabase.from('tags').delete().eq('id', id);

    if (error) {
      return fail(400, { message: error.message });
    }

    return { success: true, message: 'Tag removed.' };
  }
};
