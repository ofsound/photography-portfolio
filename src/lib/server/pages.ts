import { sanitizeCmsCss, sanitizeCmsHtml } from '$lib/server/cms-sanitize';
import { throwLoaderError } from '$lib/server/load-error';
import {
  createDefaultSveditPageDocument,
  parseSveditPageDocument,
} from '$lib/svedit/page-document';
import { photoPublicUrl } from '$lib/utils/storage-url';

type CmsPage = {
  id: string;
  slug: string;
  title: string;
  max_width_override_px: number | null;
  hero_vertical_alignment_pct: number;
  seo_title: string | null;
  seo_description: string | null;
  og_title: string | null;
  og_description: string | null;
  og_image_path: string | null;
  bg_image_url: string | null;
  bg_image_fixed: boolean;
  html_content: string;
  css_module: string;
  tailwind_css: string;
  editor_mode: 'code' | 'svedit';
  svedit_doc: unknown;
  svedit_schema_version: number;
  kind: 'home' | 'custom';
  visibility_status: 'public' | 'unlisted' | 'draft';
};

const toCmsPage = (data: {
  id: string;
  slug: string;
  title: string;
  max_width_override_px: number | null;
  hero_vertical_alignment_pct: number | null;
  seo_title: string | null;
  seo_description: string | null;
  og_title: string | null;
  og_description: string | null;
  og_image_path: string | null;
  bg_image_id: string | null;
  bg_image_fixed?: boolean | null;
  html_content: string | null;
  css_module: string | null;
  tailwind_css: string | null;
  editor_mode: string;
  svedit_doc: unknown;
  svedit_schema_version: number | null;
  kind: 'home' | 'custom';
  visibility_status: 'public' | 'unlisted' | 'draft';
  background_image?:
    | { delivery_storage_path?: string | null }
    | Array<{ delivery_storage_path?: string | null }>
    | null;
}): CmsPage => {
  const heroVerticalAlignmentPct = Number(data.hero_vertical_alignment_pct);
  const editorMode = data.editor_mode === 'svedit' ? 'svedit' : 'code';
  const parsedSveditDoc = parseSveditPageDocument(data.svedit_doc);
  const backgroundImage = Array.isArray(data.background_image)
    ? data.background_image[0]
    : data.background_image;
  const backgroundStoragePath = backgroundImage?.delivery_storage_path ?? null;

  return {
    id: data.id,
    slug: data.slug,
    title: data.title,
    max_width_override_px: data.max_width_override_px,
    seo_title: data.seo_title,
    seo_description: data.seo_description,
    og_title: data.og_title,
    og_description: data.og_description,
    og_image_path: data.og_image_path,
    kind: data.kind,
    visibility_status: data.visibility_status,
    hero_vertical_alignment_pct: Number.isFinite(heroVerticalAlignmentPct)
      ? Math.min(100, Math.max(0, Math.round(heroVerticalAlignmentPct)))
      : 50,
    bg_image_url: backgroundStoragePath
      ? photoPublicUrl(backgroundStoragePath, 2200)
      : null,
    bg_image_fixed: data.bg_image_fixed === true,
    editor_mode: editorMode,
    html_content:
      editorMode === 'code' ? sanitizeCmsHtml(data.html_content ?? '') : '',
    css_module:
      editorMode === 'code'
        ? sanitizeCmsCss(data.css_module ?? '', data.slug || data.kind)
        : '',
    tailwind_css: editorMode === 'code' ? String(data.tailwind_css ?? '') : '',
    svedit_doc: parsedSveditDoc.ok
      ? parsedSveditDoc.document
      : createDefaultSveditPageDocument(),
    svedit_schema_version: Number(data.svedit_schema_version ?? 1) || 1,
  };
};

export const loadPageBySlug = async (locals: App.Locals, slug: string) => {
  const pageWithSvedit = await locals.supabase
    .from('pages')
    .select(
      'id, slug, title, max_width_override_px, hero_vertical_alignment_pct, seo_title, seo_description, og_title, og_description, og_image_path, bg_image_id, bg_image_fixed, html_content, css_module, tailwind_css, editor_mode, svedit_doc, svedit_schema_version, kind, visibility_status, background_image:bg_image_id(delivery_storage_path)',
    )
    .eq('slug', slug)
    .is('deleted_at', null)
    .maybeSingle();

  if (pageWithSvedit.error) {
    throwLoaderError(
      {
        route: '/[rootSlug]',
        operation: 'loadPageBySlug',
        details: { slug },
      },
      pageWithSvedit.error,
    );
  }

  const data = pageWithSvedit.data;
  if (!data) return null;

  return toCmsPage({
    ...data,
    kind: data.kind as 'home' | 'custom',
    visibility_status: data.visibility_status as
      | 'public'
      | 'unlisted'
      | 'draft',
  });
};

export const loadHomePage = async (locals: App.Locals) => {
  const homeResult = await locals.supabase
    .from('pages')
    .select(
      'id, slug, title, max_width_override_px, hero_vertical_alignment_pct, seo_title, seo_description, og_title, og_description, og_image_path, bg_image_id, bg_image_fixed, html_content, css_module, tailwind_css, editor_mode, svedit_doc, svedit_schema_version, kind, visibility_status, background_image:bg_image_id(delivery_storage_path)',
    )
    .eq('kind', 'home')
    .is('deleted_at', null)
    .maybeSingle();

  if (homeResult.error) {
    throwLoaderError(
      {
        route: '/',
        operation: 'loadHomePage',
      },
      homeResult.error,
    );
  }

  if (!homeResult.data) return null;

  return toCmsPage({
    ...homeResult.data,
    kind: homeResult.data.kind as 'home' | 'custom',
    visibility_status: homeResult.data.visibility_status as
      | 'public'
      | 'unlisted'
      | 'draft',
  });
};
