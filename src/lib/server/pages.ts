import { sanitizeCmsCss, sanitizeCmsHtml } from '$lib/server/cms-sanitize';

export type CmsPage = {
  id: string;
  slug: string;
  title: string;
  html_content: string;
  css_module: string;
  kind: 'home' | 'about' | 'contact' | 'custom';
};

export const loadPageByKind = async (locals: App.Locals, kind: CmsPage['kind']) => {
  const { data } = await locals.supabase
    .from('pages')
    .select('id, slug, title, html_content, css_module, kind')
    .eq('kind', kind)
    .eq('status', 'published')
    .is('deleted_at', null)
    .maybeSingle();

  if (!data) return null;
  return {
    ...data,
    html_content: sanitizeCmsHtml(data.html_content ?? ''),
    css_module: sanitizeCmsCss(data.css_module ?? '', data.slug || data.kind)
  } as CmsPage;
};

export const loadPageBySlug = async (locals: App.Locals, slug: string) => {
  const { data } = await locals.supabase
    .from('pages')
    .select('id, slug, title, html_content, css_module, kind')
    .eq('slug', slug)
    .eq('status', 'published')
    .is('deleted_at', null)
    .maybeSingle();

  if (!data) return null;
  return {
    ...data,
    html_content: sanitizeCmsHtml(data.html_content ?? ''),
    css_module: sanitizeCmsCss(data.css_module ?? '', data.slug || data.kind)
  } as CmsPage;
};
