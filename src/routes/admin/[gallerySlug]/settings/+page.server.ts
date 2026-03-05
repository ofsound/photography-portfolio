import { error, fail, redirect } from '@sveltejs/kit';
import { resolveGalleryForAdmin } from '$lib/server/admin/galleries';
import {
  loadSettingsEditor,
  saveSettingsEditor,
} from '$lib/server/admin/settings';
import type { Actions, PageServerLoad } from './$types';

const resolveScope = async (locals: App.Locals, gallerySlug: string) => {
  const resolved = await resolveGalleryForAdmin(locals, gallerySlug);
  if (resolved.kind === 'redirect') {
    throw redirect(301, `/admin/${resolved.toSlug}/settings`);
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
    try {
      const gallery = await resolveScope(locals, params.gallerySlug);
      await saveSettingsEditor(
        locals,
        { kind: 'gallery', galleryId: gallery.id },
        form,
      );
      return { success: true, message: `Saved settings for /${gallery.slug}.` };
    } catch (cause) {
      return fail(400, {
        message:
          cause instanceof Error
            ? cause.message
            : 'Failed to save gallery settings.',
      });
    }
  },
};
