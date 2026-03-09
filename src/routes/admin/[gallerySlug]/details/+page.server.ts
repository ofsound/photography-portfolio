import { error, fail, redirect } from '@sveltejs/kit';
import { asString, getCmsRole } from '$lib/server/admin-helpers';
import {
  deleteGalleryIfEmpty,
  parseGalleryVisibilityStatus,
  resolveGalleryForAdmin,
  updateGalleryWithAutoSlug,
  validateGallerySlugInput,
} from '$lib/server/admin/galleries';
import { failForm } from '$lib/server/form-errors';
import {
  loadSettingsEditor,
  saveSettingsEditor,
} from '$lib/server/admin/settings';
import type { Actions, PageServerLoad } from './$types';

const asNullableString = (value: FormDataEntryValue | null) => {
  const text = asString(value).trim();
  return text.length ? text : null;
};

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

  return {
    ...payload,
    gallery,
    scopeLabel: `/${gallery.slug}`,
  };
};

export const actions: Actions = {
  save: async ({ locals, params, request }) => {
    const form = await request.formData();
    const gallery = await resolveScope(locals, params.gallerySlug);
    const role = await getCmsRole(locals);
    if (!role) {
      return fail(403, { message: 'Unauthorized.' });
    }

    const name = asString(form.get('name')).trim();
    const slugInput = asString(form.get('slug')).trim();
    if (role === 'admin') {
      if (!name) {
        return failForm('Name is required.', {
          fieldErrors: { name: 'Name is required.' },
          values: {
            name,
            slug: slugInput,
            visibility_status: asString(form.get('visibility_status')).trim(),
            description: asNullableString(form.get('description')) ?? '',
            seo_title: asNullableString(form.get('seo_title')) ?? '',
            seo_description:
              asNullableString(form.get('seo_description')) ?? '',
          },
        });
      }

      const slugProblem = validateGallerySlugInput(slugInput || name);
      if (slugProblem) {
        return failForm(slugProblem, {
          fieldErrors: { slug: slugProblem },
          values: {
            name,
            slug: slugInput,
            visibility_status: asString(form.get('visibility_status')).trim(),
            description: asNullableString(form.get('description')) ?? '',
            seo_title: asNullableString(form.get('seo_title')) ?? '',
            seo_description:
              asNullableString(form.get('seo_description')) ?? '',
          },
        });
      }
    }

    try {
      await saveSettingsEditor(
        locals,
        { kind: 'gallery', galleryId: gallery.id },
        form,
      );
    } catch (cause) {
      return fail(400, {
        message:
          cause instanceof Error
            ? `Failed to save settings: ${cause.message}`
            : 'Failed to save gallery settings.',
      });
    }

    if (role !== 'admin') {
      return { success: true, message: `Saved details for /${gallery.slug}.` };
    }

    let updated: Awaited<ReturnType<typeof updateGalleryWithAutoSlug>>;
    try {
      updated = await updateGalleryWithAutoSlug(locals, gallery, {
        name,
        slugInput,
        description: asNullableString(form.get('description')),
        seoTitle: asNullableString(form.get('seo_title')),
        seoDescription: asNullableString(form.get('seo_description')),
        navOrder: gallery.nav_order,
        visibilityStatus: parseGalleryVisibilityStatus(
          form.get('visibility_status'),
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

    return { success: true, message: `Saved details for /${updated.slug}.` };
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
