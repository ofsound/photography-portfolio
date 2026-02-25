import type { Database } from '$lib/types/database';
import { asBoolean, asString, toSlug } from '$lib/server/admin-helpers';
import { sanitizeCmsCss, sanitizeCmsHtml } from '$lib/server/cms-sanitize';
import { RESERVED_SLUGS } from '$lib/server/reserved-slugs';

const ALLOWED_SYSTEM_SLUGS = new Set(['about', 'contact']);

export type PageKind = Database['public']['Enums']['page_kind'];
export type PublishStatus = Database['public']['Enums']['publish_status'];

export type PagePayload = {
  title: string;
  slug: string;
  kind: PageKind;
  html_content: string;
  css_module: string;
  status: PublishStatus;
  show_in_nav: boolean;
  nav_order: number;
  seo_title: string | null;
  seo_description: string | null;
  og_image_path: string | null;
  deleted_at: string | null;
};

export const validateCmsPageSlug = (slug: string) => {
  if (RESERVED_SLUGS.has(slug) && !ALLOWED_SYSTEM_SLUGS.has(slug)) {
    return 'Slug is reserved.';
  }
  return null;
};

export const pagePayloadFromForm = (form: FormData): { ok: true; payload: PagePayload } | { ok: false; message: string } => {
  const kind: PageKind = 'custom';
  const title = asString(form.get('title')).trim();
  const slugRaw = asString(form.get('slug')).trim();
  const generatedSlug = toSlug(slugRaw || title, 'page');
  const statusRaw = asString(form.get('status'), 'published');
  const status: PublishStatus = statusRaw === 'archived' ? 'archived' : 'published';
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

  const slugProblem = validateCmsPageSlug(generatedSlug);
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
      css_module: sanitizeCmsCss(rawCss, generatedSlug || kind),
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
