import { redirect, type Actions } from '@sveltejs/kit';
import { message, setError, superValidate } from 'sveltekit-superforms/server';
import { zod4 } from 'sveltekit-superforms/adapters';

import { parseUuidList } from '$lib/server/admin-helpers';
import { pagePayloadFromForm } from '$lib/server/admin/page-form';
import { throwLoaderError } from '$lib/server/load-error';
import { isGallerySlugTaken } from '$lib/server/root-slug';
import { pageCreateSchema, pageReorderSchema } from '$lib/schemas/page';

import type { PageServerLoad } from './$types';

const loadNextNavOrder = async (locals: App.Locals) => {
  const maxResult = await locals.supabase
    .from('pages')
    .select('nav_order')
    .neq('kind', 'home')
    .order('nav_order', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (maxResult.error) {
    throw new Error(maxResult.error.message);
  }

  const maxOrder = Number(maxResult.data?.nav_order ?? 0);
  return (Number.isFinite(maxOrder) ? maxOrder : 0) + 1;
};

const parseOrderedPageIds = (raw: string) => {
  const rows = raw
    .split(/\r?\n/g)
    .map((entry) => entry.trim())
    .filter(Boolean);

  return rows.map((entry) => parseUuidList(entry)[0]);
};

const applyFieldErrors = (
  form: Parameters<typeof message>[0],
  fieldErrors?: Record<string, string | undefined>,
) => {
  if (!fieldErrors) {
    return;
  }

  for (const [field, error] of Object.entries(fieldErrors)) {
    if (error) {
      setError(form, field, error, { overwrite: true });
    }
  }
};

export const load: PageServerLoad = async ({ locals, url }) => {
  const pagesWithSvedit = await locals.supabase
    .from('pages')
    .select('id, slug, title, kind, editor_mode, visibility_status, nav_order')
    .neq('kind', 'home')
    .is('deleted_at', null)
    .order('nav_order', { ascending: true })
    .order('title', { ascending: true });

  if (pagesWithSvedit.error) {
    throwLoaderError(
      { route: '/admin/pages', operation: 'load pages list' },
      pagesWithSvedit.error,
    );
  }

  const reorderForm = await superValidate(zod4(pageReorderSchema));

  return {
    pages: pagesWithSvedit.data ?? [],
    message: url.searchParams.get('message'),
    messageSuccess: url.searchParams.get('success') === '1',
    reorderForm,
  };
};

export const actions: Actions = {
  create: async ({ locals, request }) => {
    const rawForm = await request.formData();
    const form = await superValidate(rawForm, zod4(pageCreateSchema));
    if (!form.valid) {
      const firstError =
        form.errors.title?.[0] ?? form.errors.slug?.[0] ?? 'Validation failed.';
      return message(form, firstError, { status: 400 });
    }

    const result = await pagePayloadFromForm(rawForm);

    if (!result.ok) {
      applyFieldErrors(form, result.fieldErrors);
      return message(form, result.message, { status: 400 });
    }
    if (await isGallerySlugTaken(locals, result.payload.slug)) {
      setError(form, 'slug', 'Slug conflicts with an existing gallery.', {
        overwrite: true,
      });
      return message(form, 'Slug conflicts with an existing gallery.', {
        status: 400,
      });
    }

    const navOrder = await loadNextNavOrder(locals);
    const insertResult = await locals.supabase
      .from('pages')
      .insert({
        ...result.payload,
        nav_order: navOrder,
      })
      .select('slug')
      .single();

    if (insertResult.error) {
      return message(form, insertResult.error.message, { status: 400 });
    }

    const createdSlug = insertResult.data?.slug ?? result.payload.slug;
    redirect(303, `/admin/pages/edit/${createdSlug}`);
  },

  reorder: async ({ locals, request }) => {
    const form = await superValidate(request, zod4(pageReorderSchema));
    if (!form.valid) {
      return message(form, 'Missing reorder payload.', { status: 400 });
    }

    const orderedIds = parseOrderedPageIds(form.data.ordered_page_ids);
    if (orderedIds.length < 1) {
      return message(form, 'Missing reorder payload.', { status: 400 });
    }

    if (orderedIds.some((item) => item == null)) {
      return message(form, 'Invalid reorder payload.', { status: 400 });
    }

    const pagesQuery = await locals.supabase
      .from('pages')
      .select('id')
      .neq('kind', 'home')
      .is('deleted_at', null);
    if (pagesQuery.error) {
      return message(form, pagesQuery.error.message, { status: 400 });
    }

    const expectedIds = (pagesQuery.data ?? []).map((page) => page.id);

    if (orderedIds.length !== expectedIds.length) {
      return message(form, 'Invalid reorder payload.', { status: 400 });
    }

    const seen: string[] = [];
    for (const id of orderedIds as string[]) {
      if (seen.includes(id) || !expectedIds.includes(id)) {
        return message(form, 'Invalid reorder payload.', {
          status: 400,
        });
      }
      seen.push(id);
    }

    try {
      for (const [index, id] of (orderedIds as string[]).entries()) {
        const updatePageResult = await locals.supabase
          .from('pages')
          .update({ nav_order: index })
          .eq('id', id)
          .neq('kind', 'home');
        if (updatePageResult.error) {
          throw new Error(updatePageResult.error.message);
        }
      }

      return message(form, 'Page order saved.');
    } catch (cause) {
      return message(
        form,
        cause instanceof Error ? cause.message : 'Failed to reorder pages.',
        { status: 400 },
      );
    }
  },
};
