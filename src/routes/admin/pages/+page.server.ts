import { fail, redirect, type Actions } from '@sveltejs/kit';
import { asString, parseUuidList } from '$lib/server/admin-helpers';
import { pagePayloadFromForm } from '$lib/server/admin/page-form';
import { failForm } from '$lib/server/form-errors';
import { throwLoaderError } from '$lib/server/load-error';
import { isGallerySlugTaken } from '$lib/server/root-slug';
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

const parseOrderedPageIds = (value: FormDataEntryValue | null) => {
  const raw = asString(value);
  const rows = raw
    .split(/\r?\n/g)
    .map((entry) => entry.trim())
    .filter(Boolean);

  return rows.map((entry) => parseUuidList(entry)[0]);
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

  return {
    pages: pagesWithSvedit.data ?? [],
    message: url.searchParams.get('message'),
    messageSuccess: url.searchParams.get('success') === '1',
  };
};

export const actions: Actions = {
  create: async ({ locals, request }) => {
    const form = await request.formData();
    const result = await pagePayloadFromForm(form);

    if (!result.ok) {
      return failForm(result.message, {
        fieldErrors: result.fieldErrors,
        values: result.values,
      });
    }
    if (await isGallerySlugTaken(locals, result.payload.slug)) {
      return failForm('Slug conflicts with an existing gallery.', {
        fieldErrors: { slug: 'Slug conflicts with an existing gallery.' },
        values: {
          title: asString(form.get('title')).trim(),
          slug: asString(form.get('slug')).trim(),
          editor_mode: asString(form.get('editor_mode')).trim(),
        },
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
      return fail(400, { message: insertResult.error.message });
    }

    const createdSlug = insertResult.data?.slug ?? result.payload.slug;
    redirect(303, `/admin/pages/edit/${createdSlug}`);
  },

  reorder: async ({ locals, request }) => {
    const form = await request.formData();
    const orderedIds = parseOrderedPageIds(form.get('ordered_page_ids'));
    if (orderedIds.length < 1) {
      return fail(400, { message: 'Missing reorder payload.' });
    }

    if (orderedIds.some((item) => item == null)) {
      return fail(400, { message: 'Invalid reorder payload.' });
    }

    const pagesQuery = await locals.supabase
      .from('pages')
      .select('id')
      .neq('kind', 'home')
      .is('deleted_at', null);
    if (pagesQuery.error) {
      return fail(400, { message: pagesQuery.error.message });
    }

    const expectedIds = (pagesQuery.data ?? []).map((page) => page.id);

    if (orderedIds.length !== expectedIds.length) {
      return fail(400, { message: 'Invalid reorder payload.' });
    }

    const seen: string[] = [];
    for (const id of orderedIds as string[]) {
      if (seen.includes(id) || !expectedIds.includes(id)) {
        return fail(400, { message: 'Invalid reorder payload.' });
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

      return { success: true, message: 'Page order saved.' };
    } catch (cause) {
      return fail(400, {
        message:
          cause instanceof Error ? cause.message : 'Failed to reorder pages.',
      });
    }
  },
};
