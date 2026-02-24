import { fail, type Actions } from '@sveltejs/kit';
import { asBoolean, asString, toSlug } from '$lib/server/admin-helpers';
import { sanitizeCmsCss, sanitizeCmsHtml } from '$lib/server/cms-sanitize';
import { RESERVED_SLUGS } from '$lib/server/reserved-slugs';
import type { PageServerLoad } from './$types';

const systemKindToSlug: Record<'home' | 'about' | 'contact', string> = {
  home: '',
  about: 'about',
  contact: 'contact'
};

export const load: PageServerLoad = async ({ locals }) => {
  const [{ data: pages }, { data: revisions }] = await Promise.all([
    locals.supabase
      .from('pages')
      .select('id, slug, title, kind, html_content, css_module, seo_title, seo_description, og_image_path, status, show_in_nav, nav_order, deleted_at, updated_at')
      .order('updated_at', { ascending: false }),
    locals.supabase
      .from('content_revisions')
      .select('id, entity_type, entity_pk, version_no, changed_at, changed_by, snapshot')
      .eq('entity_type', 'page')
      .order('changed_at', { ascending: false })
      .limit(300)
  ]);

  return {
    pages: pages ?? [],
    revisions: revisions ?? []
  };
};

const validateSlug = (slug: string, kind: string) => {
  if (kind === 'custom' && RESERVED_SLUGS.has(slug)) {
    return 'Slug is reserved.';
  }
  return null;
};

type PagePayload = {
  title: string;
  slug: string;
  kind: 'home' | 'about' | 'contact' | 'custom';
  html_content: string;
  css_module: string;
  status: string;
  show_in_nav: boolean;
  nav_order: number;
  seo_title: string | null;
  seo_description: string | null;
  og_image_path: string | null;
  deleted_at: string | null;
};

const pagePayloadFromForm = (form: FormData): { ok: true; payload: PagePayload } | { ok: false; message: string } => {
  const kind = asString(form.get('kind'), 'custom') as 'home' | 'about' | 'contact' | 'custom';
  const title = asString(form.get('title')).trim();
  const slugRaw = asString(form.get('slug')).trim();
  const generatedSlug = kind === 'custom' ? toSlug(slugRaw || title, 'page') : systemKindToSlug[kind as 'home' | 'about' | 'contact'];
  const status = asString(form.get('status'), 'published');
  const showInNav = asBoolean(form.get('show_in_nav'));
  const navOrder = Number(asString(form.get('nav_order'), '0')) || 0;
  const seoTitle = asString(form.get('seo_title')).trim() || null;
  const seoDescription = asString(form.get('seo_description')).trim() || null;
  const ogImagePath = asString(form.get('og_image_path')).trim() || null;
  const rawHtml = asString(form.get('html_content'));
  const rawCss = asString(form.get('css_module'));

  if (!title) {
    return { ok: false, message: 'Title is required.' };
  }

  if (rawHtml.toLowerCase().includes('<iframe')) {
    return { ok: false, message: 'iframe embeds are blocked in v1.' };
  }

  const slugProblem = validateSlug(generatedSlug, kind);
  if (slugProblem) {
    return { ok: false, message: slugProblem };
  }

  return {
    ok: true,
    payload: {
    title,
    slug: generatedSlug,
    kind,
    html_content: sanitizeCmsHtml(rawHtml),
    css_module: sanitizeCmsCss(rawCss),
    status,
    show_in_nav: showInNav,
    nav_order: navOrder,
    seo_title: seoTitle,
    seo_description: seoDescription,
    og_image_path: ogImagePath,
    deleted_at: status === 'archived' ? new Date().toISOString() : null
    }
  };
};

export const actions: Actions = {
  create: async ({ locals, request }) => {
    const form = await request.formData();
    const result = pagePayloadFromForm(form);

    if (!result.ok) return fail(400, { message: result.message });

    const { error } = await locals.supabase.from('pages').insert(result.payload);
    if (error) {
      return fail(400, { message: error.message });
    }

    return { success: true, message: 'Page created.' };
  },

  update: async ({ locals, request }) => {
    const form = await request.formData();
    const id = asString(form.get('id'));
    if (!id) {
      return fail(400, { message: 'Missing page id.' });
    }

    const result = pagePayloadFromForm(form);
    if (!result.ok) return fail(400, { message: result.message });

    const { error } = await locals.supabase.from('pages').update(result.payload).eq('id', id);
    if (error) {
      return fail(400, { message: error.message });
    }

    return { success: true, message: 'Page updated.' };
  },

  archive: async ({ locals, request }) => {
    const form = await request.formData();
    const id = asString(form.get('id'));

    const { error } = await locals.supabase
      .from('pages')
      .update({ status: 'archived', deleted_at: new Date().toISOString() })
      .eq('id', id);

    if (error) {
      return fail(400, { message: error.message });
    }

    return { success: true, message: 'Page archived.' };
  },

  restore: async ({ locals, request }) => {
    const form = await request.formData();
    const id = asString(form.get('id'));

    const { error } = await locals.supabase
      .from('pages')
      .update({ status: 'published', deleted_at: null })
      .eq('id', id);

    if (error) {
      return fail(400, { message: error.message });
    }

    return { success: true, message: 'Page restored.' };
  },

  rollback: async ({ locals, request }) => {
    const form = await request.formData();
    const revisionId = Number(asString(form.get('revision_id')));

    if (!Number.isFinite(revisionId)) {
      return fail(400, { message: 'Invalid revision id.' });
    }

    const { data: revision, error: revisionError } = await locals.supabase
      .from('content_revisions')
      .select('id, entity_type, entity_pk, snapshot')
      .eq('id', revisionId)
      .eq('entity_type', 'page')
      .maybeSingle();

    if (revisionError || !revision) {
      return fail(404, { message: 'Revision not found.' });
    }

    const snapshot = revision.snapshot as Record<string, unknown>;
    const id = String(snapshot.id ?? revision.entity_pk);

    const payload = {
      slug: String(snapshot.slug ?? ''),
      title: String(snapshot.title ?? ''),
      kind: String(snapshot.kind ?? 'custom'),
      html_content: sanitizeCmsHtml(String(snapshot.html_content ?? '')),
      css_module: sanitizeCmsCss(String(snapshot.css_module ?? '')),
      seo_title: snapshot.seo_title ? String(snapshot.seo_title) : null,
      seo_description: snapshot.seo_description ? String(snapshot.seo_description) : null,
      og_image_path: snapshot.og_image_path ? String(snapshot.og_image_path) : null,
      status: String(snapshot.status ?? 'published'),
      show_in_nav: Boolean(snapshot.show_in_nav),
      nav_order: Number(snapshot.nav_order ?? 0),
      deleted_at: snapshot.deleted_at ? String(snapshot.deleted_at) : null
    };

    const slugProblem = validateSlug(payload.slug, payload.kind);
    if (slugProblem) {
      return fail(400, { message: slugProblem });
    }

    if (payload.html_content.toLowerCase().includes('<iframe')) {
      return fail(400, { message: 'Cannot roll back to iframe content in v1.' });
    }

    const { error } = await locals.supabase.from('pages').update(payload).eq('id', id);

    if (error) {
      return fail(400, { message: error.message });
    }

    return { success: true, message: 'Page rolled back from revision.' };
  }
};
