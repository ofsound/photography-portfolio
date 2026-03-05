import { error, fail, type Actions } from '@sveltejs/kit';
import {
  asBoolean,
  asOptionalNumber,
  asString,
  getCmsRole,
} from '$lib/server/admin-helpers';
import {
  createGalleryWithAutoSlug,
  deleteGalleryIfEmpty,
  ensureAllSettingsSeeded,
  listGalleriesForAdmin,
  updateGalleryWithAutoSlug,
  validateGallerySlugInput,
} from '$lib/server/admin/galleries';
import type { PageServerLoad } from './$types';

const asNullableString = (value: FormDataEntryValue | null) => {
  const text = asString(value).trim();
  return text.length ? text : null;
};

const requireAdmin = async (locals: App.Locals) => {
  const role = await getCmsRole(locals);
  if (role !== 'admin') return false;
  return true;
};

export const load: PageServerLoad = async ({ locals }) => {
  if (!(await requireAdmin(locals))) {
    throw error(403, 'Only admins can manage galleries.');
  }
  await ensureAllSettingsSeeded(locals);
  const galleries = await listGalleriesForAdmin(locals);
  return {
    galleries,
  };
};

export const actions: Actions = {
  create: async ({ locals, request }) => {
    if (!(await requireAdmin(locals))) {
      return fail(403, { message: 'Only admins can manage galleries.' });
    }

    const form = await request.formData();
    const name = asString(form.get('name')).trim();
    const slugInput = asString(form.get('slug')).trim();
    if (!name) {
      return fail(400, { message: 'Name is required.' });
    }

    const slugProblem = validateGallerySlugInput(slugInput || name);
    if (slugProblem) {
      return fail(400, { message: slugProblem });
    }

    try {
      const created = await createGalleryWithAutoSlug(locals, {
        name,
        slugInput,
        description: asNullableString(form.get('description')),
        seoTitle: asNullableString(form.get('seo_title')),
        seoDescription: asNullableString(form.get('seo_description')),
        isActive: asBoolean(form.get('is_active')),
        showInNav: asBoolean(form.get('show_in_nav')),
        navOrder: asOptionalNumber(form.get('nav_order')) ?? 0,
      });

      const requested = slugInput || name;
      return {
        success: true,
        message:
          created.slug === requested
            ? `Created gallery "${created.gallery.name}".`
            : `Created gallery "${created.gallery.name}" with slug "${created.slug}".`,
      };
    } catch (cause) {
      return fail(400, {
        message:
          cause instanceof Error ? cause.message : 'Failed to create gallery.',
      });
    }
  },

  update: async ({ locals, request }) => {
    if (!(await requireAdmin(locals))) {
      return fail(403, { message: 'Only admins can manage galleries.' });
    }

    const form = await request.formData();
    const galleryId = asString(form.get('gallery_id'));
    const name = asString(form.get('name')).trim();
    const slugInput = asString(form.get('slug')).trim();
    if (!galleryId) {
      return fail(400, { message: 'Missing gallery ID.' });
    }
    if (!name) {
      return fail(400, { message: 'Name is required.' });
    }

    const slugProblem = validateGallerySlugInput(slugInput || name);
    if (slugProblem) {
      return fail(400, { message: slugProblem });
    }

    const currentQuery = await locals.supabase
      .from('galleries')
      .select(
        'id, slug, name, description, seo_title, seo_description, is_active, show_in_nav, nav_order',
      )
      .eq('id', galleryId)
      .maybeSingle();

    if (currentQuery.error) {
      return fail(400, { message: currentQuery.error.message });
    }
    if (!currentQuery.data) {
      return fail(404, { message: 'Gallery not found.' });
    }

    try {
      const updated = await updateGalleryWithAutoSlug(
        locals,
        currentQuery.data,
        {
          name,
          slugInput,
          description: asNullableString(form.get('description')),
          seoTitle: asNullableString(form.get('seo_title')),
          seoDescription: asNullableString(form.get('seo_description')),
          isActive: asBoolean(form.get('is_active')),
          showInNav: asBoolean(form.get('show_in_nav')),
          navOrder: asOptionalNumber(form.get('nav_order')) ?? 0,
        },
      );

      const requested = slugInput || name;
      return {
        success: true,
        message:
          updated.slug === requested
            ? 'Gallery updated.'
            : `Gallery updated. Slug adjusted to "${updated.slug}".`,
      };
    } catch (cause) {
      return fail(400, {
        message:
          cause instanceof Error ? cause.message : 'Failed to update gallery.',
      });
    }
  },

  delete: async ({ locals, request }) => {
    if (!(await requireAdmin(locals))) {
      return fail(403, { message: 'Only admins can manage galleries.' });
    }

    const form = await request.formData();
    const galleryId = asString(form.get('gallery_id'));
    if (!galleryId) {
      return fail(400, { message: 'Missing gallery ID.' });
    }

    try {
      await deleteGalleryIfEmpty(locals, galleryId);
      return { success: true, message: 'Gallery deleted.' };
    } catch (cause) {
      return fail(400, {
        message:
          cause instanceof Error ? cause.message : 'Failed to delete gallery.',
      });
    }
  },
};
