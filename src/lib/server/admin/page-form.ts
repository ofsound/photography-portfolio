import type { Database } from '$lib/types/database';
import { asBoolean, asString, toSlug } from '$lib/server/admin-helpers';
import { sanitizeCmsCss, sanitizeCmsHtml } from '$lib/server/cms-sanitize';
import { RESERVED_SLUGS } from '$lib/server/reserved-slugs';
import {
  createDefaultSveditPageDocument,
  parseSveditPageDocument,
  SVEDIT_PAGE_SCHEMA_VERSION,
} from '$lib/svedit/page-document';

const ALLOWED_SYSTEM_SLUGS = new Set(['about']);

type PageKind = Database['public']['Enums']['page_kind'];
type PageEditorMode = Database['public']['Enums']['page_editor_mode'];
export type PublishStatus = Database['public']['Enums']['publish_status'];
export type PagePublishStatus = Extract<PublishStatus, 'published' | 'draft'>;

type PagePayload = {
  title: string;
  slug: string;
  kind: PageKind;
  html_content: string;
  css_module: string;
  editor_mode: PageEditorMode;
  svedit_doc: Database['public']['Tables']['pages']['Insert']['svedit_doc'];
  svedit_schema_version: number;
  status: PagePublishStatus;
  show_in_nav: boolean;
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

export const pagePayloadFromForm = (
  form: FormData,
): { ok: true; payload: PagePayload } | { ok: false; message: string } => {
  const kind: PageKind = 'custom';
  const title = asString(form.get('title')).trim();
  const slugRaw = asString(form.get('slug')).trim();
  const generatedSlug = toSlug(slugRaw || title, 'page');
  const statusRaw = asString(form.get('status'), 'published');
  const status: PagePublishStatus =
    statusRaw === 'published' ? 'published' : 'draft';
  const showInNav = asBoolean(form.get('show_in_nav'));
  const seoTitle = asString(form.get('seo_title')).trim() || null;
  const seoDescription = asString(form.get('seo_description')).trim() || null;
  const ogImagePath = asString(form.get('og_image_path')).trim() || null;
  const rawHtml = asString(form.get('html_content'));
  const rawCss = asString(form.get('css_module'));
  const rawSveditDoc = asString(form.get('svedit_doc'));
  const editorModeRaw = asString(form.get('editor_mode'), 'code');
  const editorMode: PageEditorMode =
    editorModeRaw === 'svedit' ? 'svedit' : 'code';

  if (!title) {
    return { ok: false, message: 'Title is required.' };
  }

  if (editorMode === 'code' && rawHtml.toLowerCase().includes('<iframe')) {
    return { ok: false, message: 'iframe embeds are blocked in v1.' };
  }

  const slugProblem = validateCmsPageSlug(generatedSlug);
  if (slugProblem) {
    return { ok: false, message: slugProblem };
  }

  const sveditDocResult =
    editorMode === 'svedit'
      ? parseSveditPageDocument(
        rawSveditDoc || createDefaultSveditPageDocument(),
      )
      : null;

  if (sveditDocResult && !sveditDocResult.ok) {
    return { ok: false, message: sveditDocResult.message };
  }

  return {
    ok: true,
    payload: {
      title,
      slug: generatedSlug,
      kind,
      html_content: editorMode === 'code' ? sanitizeCmsHtml(rawHtml) : '',
      css_module:
        editorMode === 'code'
          ? sanitizeCmsCss(rawCss, generatedSlug || kind)
          : '',
      editor_mode: editorMode,
      svedit_doc: sveditDocResult?.ok ? sveditDocResult.document : null,
      svedit_schema_version: SVEDIT_PAGE_SCHEMA_VERSION,
      status,
      show_in_nav: showInNav,
      seo_title: seoTitle,
      seo_description: seoDescription,
      og_image_path: ogImagePath,
      deleted_at: null,
    },
  };
};
