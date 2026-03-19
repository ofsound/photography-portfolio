import { error, fail, type Actions } from '@sveltejs/kit';
import { superValidate, message } from 'sveltekit-superforms/server';
import { zod4 } from 'sveltekit-superforms/adapters';

import { getCmsRole, parseUuidList } from '$lib/server/admin-helpers';
import {
  createGalleryWithAutoSlug,
  listGalleriesForAdmin,
  parseGalleryVisibilityStatus,
  validateGallerySlugInput,
} from '$lib/server/admin/galleries';
import {
  galleryCreateSchema,
  galleryReorderSchema,
} from '$lib/schemas/gallery';

import type { PageServerLoad } from './$types';

const requireAdmin = async (locals: App.Locals) => {
  const role = await getCmsRole(locals);
  if (role !== 'admin') return false;
  return true;
};

const loadNextNavOrder = async (locals: App.Locals) => {
  const galleryMaxResult = await locals.supabase
    .from('galleries')
    .select('nav_order')
    .order('nav_order', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (galleryMaxResult.error) {
    throw new Error(galleryMaxResult.error.message);
  }

  const maxGalleryOrder = Number(galleryMaxResult.data?.nav_order ?? 0);
  return (Number.isFinite(maxGalleryOrder) ? maxGalleryOrder : 0) + 1;
};

const parseOrderedCardIds = (raw: string) => {
  const rows = raw
    .split(/\r?\n/g)
    .map((entry) => entry.trim())
    .filter(Boolean);

  return rows.map((entry) => parseUuidList(entry)[0]);
};

export const load: PageServerLoad = async ({ locals }) => {
  if (!(await requireAdmin(locals))) {
    throw error(403, 'Only admins can manage galleries.');
  }
  const galleries = await listGalleriesForAdmin(locals);
  const [createForm, reorderForm] = await Promise.all([
    superValidate(zod4(galleryCreateSchema)),
    superValidate(zod4(galleryReorderSchema)),
  ]);
  return { galleries, createForm, reorderForm };
};

export const actions: Actions = {
  create: async ({ locals, request }) => {
    if (!(await requireAdmin(locals))) {
      return fail(403, { message: 'Only admins can manage galleries.' });
    }

    const form = await superValidate(request, zod4(galleryCreateSchema));
    if (!form.valid) {
      return message(form, 'Name is required.', { status: 400 });
    }

    const { name, slug: slugInput, visibility_status } = form.data;

    const slugProblem = validateGallerySlugInput(slugInput || name);
    if (slugProblem) {
      form.errors.slug = [slugProblem];
      return message(form, slugProblem, { status: 400 });
    }

    try {
      const navOrder = await loadNextNavOrder(locals);
      const created = await createGalleryWithAutoSlug(locals, {
        name,
        slugInput,
        navOrder,
        visibilityStatus: parseGalleryVisibilityStatus(visibility_status),
      });

      const requested = slugInput || name;
      return message(
        form,
        created.slug === requested
          ? `Created gallery "${created.gallery.name}".`
          : `Created gallery "${created.gallery.name}" with slug "${created.slug}".`,
      );
    } catch (cause) {
      return message(
        form,
        cause instanceof Error ? cause.message : 'Failed to create gallery.',
        { status: 400 },
      );
    }
  },

  reorder: async ({ locals, request }) => {
    if (!(await requireAdmin(locals))) {
      return fail(403, { message: 'Only admins can manage galleries.' });
    }

    const form = await superValidate(request, zod4(galleryReorderSchema));
    if (!form.valid) {
      return message(form, 'Missing reorder payload.', { status: 400 });
    }

    const orderedIds = parseOrderedCardIds(form.data.ordered_gallery_ids);
    if (orderedIds.length < 1) {
      return message(form, 'Missing reorder payload.', { status: 400 });
    }

    if (orderedIds.some((item) => item == null)) {
      return message(form, 'Invalid reorder payload.', { status: 400 });
    }

    const galleriesQuery = await locals.supabase.from('galleries').select('id');
    if (galleriesQuery.error) {
      return message(form, galleriesQuery.error.message, { status: 400 });
    }

    const expectedIds = new Set<string>();
    for (const gallery of galleriesQuery.data ?? []) {
      expectedIds.add(gallery.id);
    }

    if (orderedIds.length !== expectedIds.size) {
      return message(form, 'Invalid reorder payload.', { status: 400 });
    }

    const seen = new Set<string>();
    for (const id of orderedIds as string[]) {
      if (seen.has(id) || !expectedIds.has(id)) {
        return message(form, 'Invalid reorder payload.', { status: 400 });
      }
      seen.add(id);
    }

    try {
      for (const [index, id] of (orderedIds as string[]).entries()) {
        const updateGalleryResult = await locals.supabase
          .from('galleries')
          .update({ nav_order: index })
          .eq('id', id);
        if (updateGalleryResult.error) {
          throw new Error(updateGalleryResult.error.message);
        }
      }

      return message(form, 'Gallery order saved.');
    } catch (cause) {
      return message(
        form,
        cause instanceof Error ? cause.message : 'Failed to reorder galleries.',
        { status: 400 },
      );
    }
  },
};
