import { error, fail, type Actions } from '@sveltejs/kit';
import { asString, getCmsRole, parseUuidList } from '$lib/server/admin-helpers';
import {
  createGalleryWithAutoSlug,
  ensureAllSettingsSeeded,
  listGalleriesForAdmin,
  validateGallerySlugInput,
} from '$lib/server/admin/galleries';
import type { PageServerLoad } from './$types';

const requireAdmin = async (locals: App.Locals) => {
  const role = await getCmsRole(locals);
  if (role !== 'admin') return false;
  return true;
};

const loadAllScopeNav = async (locals: App.Locals) => {
  const allSettings = await locals.supabase
    .from('gallery_settings')
    .select('*')
    .eq('scope', 'all')
    .maybeSingle();

  if (allSettings.error || !allSettings.data) {
    return {
      show_in_nav: true,
      nav_order: 0,
    };
  }

  const row = allSettings.data as Record<string, unknown>;
  const parsedNavOrder = Number(row.nav_order);

  return {
    show_in_nav: typeof row.show_in_nav === 'boolean' ? row.show_in_nav : true,
    nav_order: Number.isFinite(parsedNavOrder) ? parsedNavOrder : 0,
  };
};

const loadNextNavOrder = async (locals: App.Locals) => {
  const [galleryMaxResult, allScopeNav] = await Promise.all([
    locals.supabase
      .from('galleries')
      .select('nav_order')
      .order('nav_order', { ascending: false })
      .limit(1)
      .maybeSingle(),
    loadAllScopeNav(locals),
  ]);

  if (galleryMaxResult.error) {
    throw new Error(galleryMaxResult.error.message);
  }

  const maxGalleryOrder = Number(galleryMaxResult.data?.nav_order ?? 0);
  const baseline = Number.isFinite(maxGalleryOrder) ? maxGalleryOrder : 0;

  return Math.max(baseline, allScopeNav.nav_order) + 1;
};

const parseOrderedCardIds = (value: FormDataEntryValue | null) => {
  const raw = asString(value);
  const rows = raw
    .split(/\r?\n/g)
    .map((entry) => entry.trim())
    .filter(Boolean);

  return rows.map((entry) =>
    entry === 'all' ? entry : parseUuidList(entry)[0],
  );
};

export const load: PageServerLoad = async ({ locals }) => {
  if (!(await requireAdmin(locals))) {
    throw error(403, 'Only admins can manage galleries.');
  }
  await ensureAllSettingsSeeded(locals);
  const [galleries, allScopeNav] = await Promise.all([
    listGalleriesForAdmin(locals),
    loadAllScopeNav(locals),
  ]);
  return {
    galleries,
    allScopeNav,
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
      const navOrder = await loadNextNavOrder(locals);
      const created = await createGalleryWithAutoSlug(locals, {
        name,
        slugInput,
        navOrder,
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

  reorder: async ({ locals, request }) => {
    if (!(await requireAdmin(locals))) {
      return fail(403, { message: 'Only admins can manage galleries.' });
    }

    await ensureAllSettingsSeeded(locals);

    const form = await request.formData();
    const orderedIds = parseOrderedCardIds(form.get('ordered_gallery_ids'));
    if (orderedIds.length < 1) {
      return fail(400, { message: 'Missing reorder payload.' });
    }

    if (orderedIds.some((item) => item == null)) {
      return fail(400, { message: 'Invalid reorder payload.' });
    }

    const galleriesQuery = await locals.supabase.from('galleries').select('id');
    if (galleriesQuery.error) {
      return fail(400, { message: galleriesQuery.error.message });
    }

    const allQuery = await locals.supabase
      .from('gallery_settings')
      .select('id')
      .eq('scope', 'all')
      .maybeSingle();
    if (allQuery.error || !allQuery.data) {
      return fail(400, {
        message: allQuery.error?.message ?? 'Missing /all settings row.',
      });
    }

    const expectedIds = new Set(['all']);
    for (const gallery of galleriesQuery.data ?? []) {
      expectedIds.add(gallery.id);
    }

    if (orderedIds.length !== expectedIds.size) {
      return fail(400, { message: 'Invalid reorder payload.' });
    }

    const seen = new Set<string>();
    for (const id of orderedIds as string[]) {
      if (seen.has(id) || !expectedIds.has(id)) {
        return fail(400, { message: 'Invalid reorder payload.' });
      }
      seen.add(id);
    }

    try {
      for (const [index, id] of (orderedIds as string[]).entries()) {
        if (id === 'all') {
          const updateAllResult = await locals.supabase
            .from('gallery_settings')
            .update({ nav_order: index })
            .eq('scope', 'all');
          if (updateAllResult.error) {
            throw new Error(updateAllResult.error.message);
          }
          continue;
        }

        const updateGalleryResult = await locals.supabase
          .from('galleries')
          .update({ nav_order: index })
          .eq('id', id);
        if (updateGalleryResult.error) {
          throw new Error(updateGalleryResult.error.message);
        }
      }

      return { success: true, message: 'Gallery order saved.' };
    } catch (cause) {
      return fail(400, {
        message:
          cause instanceof Error
            ? cause.message
            : 'Failed to reorder galleries.',
      });
    }
  },
};
