import type { Database } from '$lib/types/database';
import { asString, toSlug } from '$lib/server/admin-helpers';
import { sanitizeCmsCssRaw, sanitizeCmsHtml } from '$lib/server/cms-sanitize';
import {
  compileCmsTailwindCss,
  CmsTailwindCompileError,
} from '$lib/server/cms-tailwind';
import type { FieldErrors, FormValues } from '$lib/server/form-errors';
import { RESERVED_SLUGS } from '$lib/server/reserved-slugs';
import {
  createDefaultSveditPageDocument,
  parseSveditPageDocument,
  SVEDIT_PAGE_SCHEMA_VERSION,
} from '$lib/svedit/page-document';

const ALLOWED_SYSTEM_SLUGS = new Set(['about']);

type PageKind = Database['public']['Enums']['page_kind'];
type PageEditorMode = Database['public']['Enums']['page_editor_mode'];
export type PageVisibilityStatus =
  Database['public']['Enums']['page_visibility_status'];

type PagePayload = {
  title: string;
  slug: string;
  kind: PageKind;
  html_content: string;
  css_module: string;
  tailwind_css: string;
  editor_mode: PageEditorMode;
  svedit_doc: Database['public']['Tables']['pages']['Insert']['svedit_doc'];
  svedit_schema_version: number;
  visibility_status: PageVisibilityStatus;
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

export const pagePayloadFromForm = async (
  form: FormData,
): Promise<
  | { ok: true; payload: PagePayload }
  | {
      ok: false;
      message: string;
      fieldErrors?: FieldErrors;
      values?: FormValues;
    }
> => {
  const kind: PageKind = 'custom';
  const title = asString(form.get('title')).trim();
  const slugRaw = asString(form.get('slug')).trim();
  const generatedSlug = toSlug(slugRaw || title, 'page');
  const visibilityRaw = asString(form.get('visibility_status'), 'draft');
  const visibilityStatus: PageVisibilityStatus =
    visibilityRaw === 'public' || visibilityRaw === 'unlisted'
      ? visibilityRaw
      : 'draft';
  const seoTitle = asString(form.get('seo_title')).trim() || null;
  const seoDescription = asString(form.get('seo_description')).trim() || null;
  const ogImagePath = asString(form.get('og_image_path')).trim() || null;
  const rawHtml = asString(form.get('html_content'));
  const rawCss = asString(form.get('css_module'));
  const rawSveditDoc = asString(form.get('svedit_doc'));
  const editorModeRaw = asString(form.get('editor_mode'), 'code');
  const editorMode: PageEditorMode =
    editorModeRaw === 'svedit' ? 'svedit' : 'code';
  const values: FormValues = {
    title,
    slug: slugRaw,
    visibility_status: visibilityRaw,
    seo_title: seoTitle ?? '',
    seo_description: seoDescription ?? '',
    og_image_path: ogImagePath ?? '',
    editor_mode: editorMode,
    html_content: rawHtml,
    css_module: rawCss,
    svedit_doc: rawSveditDoc,
  };

  if (!title) {
    return {
      ok: false,
      message: 'Title is required.',
      fieldErrors: { title: 'Title is required.' },
      values,
    };
  }

  if (editorMode === 'code' && rawHtml.toLowerCase().includes('<iframe')) {
    return {
      ok: false,
      message: 'iframe embeds are blocked in v1.',
      fieldErrors: { html_content: 'iframe embeds are blocked in v1.' },
      values,
    };
  }

  const slugProblem = validateCmsPageSlug(generatedSlug);
  if (slugProblem) {
    return {
      ok: false,
      message: slugProblem,
      fieldErrors: { slug: slugProblem },
      values,
    };
  }

  const sveditDocResult =
    editorMode === 'svedit'
      ? parseSveditPageDocument(
          rawSveditDoc || createDefaultSveditPageDocument(),
        )
      : null;

  if (sveditDocResult && !sveditDocResult.ok) {
    return {
      ok: false,
      message: sveditDocResult.message,
      fieldErrors: { svedit_doc: sveditDocResult.message },
      values,
    };
  }

  const sanitizedHtml = editorMode === 'code' ? sanitizeCmsHtml(rawHtml) : '';
  let tailwindCss = '';

  if (editorMode === 'code') {
    try {
      tailwindCss = await compileCmsTailwindCss(sanitizedHtml);
    } catch (error: unknown) {
      const message =
        error instanceof CmsTailwindCompileError
          ? error.message
          : 'Failed to compile Tailwind CSS for this page.';
      return {
        ok: false,
        message,
        fieldErrors: { html_content: message },
        values,
      };
    }
  }

  return {
    ok: true,
    payload: {
      title,
      slug: generatedSlug,
      kind,
      html_content: sanitizedHtml,
      css_module: editorMode === 'code' ? sanitizeCmsCssRaw(rawCss) : '',
      tailwind_css: tailwindCss,
      editor_mode: editorMode,
      svedit_doc: sveditDocResult?.ok ? sveditDocResult.document : null,
      svedit_schema_version: SVEDIT_PAGE_SCHEMA_VERSION,
      visibility_status: visibilityStatus,
      seo_title: seoTitle,
      seo_description: seoDescription,
      og_image_path: ogImagePath,
      deleted_at: null,
    },
  };
};
