import { sanitizeCmsCss, sanitizeCmsHtml } from '$lib/server/cms-sanitize';
import { throwLoaderError } from '$lib/server/load-error';
import {
  createDefaultSveditPageDocument,
  parseSveditPageDocument,
} from '$lib/svedit/page-document';

type CmsPage = {
  id: string;
  slug: string;
  title: string;
  html_content: string;
  css_module: string;
  editor_mode: 'code' | 'svedit';
  svedit_doc: unknown;
  svedit_schema_version: number;
  kind: 'home' | 'about' | 'contact' | 'custom';
};

export const loadPageBySlug = async (locals: App.Locals, slug: string) => {
  const pageWithSvedit = await locals.supabase
    .from('pages')
    .select(
      'id, slug, title, html_content, css_module, editor_mode, svedit_doc, svedit_schema_version, kind',
    )
    .eq('slug', slug)
    .eq('status', 'published')
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
  const editorMode = data.editor_mode === 'svedit' ? 'svedit' : 'code';
  const parsedSveditDoc = parseSveditPageDocument(data.svedit_doc);

  return {
    ...data,
    editor_mode: editorMode,
    html_content:
      editorMode === 'code' ? sanitizeCmsHtml(data.html_content ?? '') : '',
    css_module:
      editorMode === 'code'
        ? sanitizeCmsCss(data.css_module ?? '', data.slug || data.kind)
        : '',
    svedit_doc: parsedSveditDoc.ok
      ? parsedSveditDoc.document
      : createDefaultSveditPageDocument(),
    svedit_schema_version: Number(data.svedit_schema_version ?? 1) || 1,
  } as CmsPage;
};
