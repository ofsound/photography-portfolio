import { sanitizeCmsCss, sanitizeCmsHtml } from '$lib/server/cms-sanitize';
import { throwLoaderError } from '$lib/server/load-error';

type CmsPage = {
  id: string;
  slug: string;
  title: string;
  html_content: string;
  css_module: string;
  kind: 'home' | 'about' | 'contact' | 'custom';
};

export const loadPageBySlug = async (locals: App.Locals, slug: string) => {
  const pageQuery = await locals.supabase
    .from('pages')
    .select('id, slug, title, html_content, css_module, kind')
    .eq('slug', slug)
    .eq('status', 'published')
    .is('deleted_at', null)
    .maybeSingle();

  if (pageQuery.error) {
    throwLoaderError(
      {
        route: '/[staticPageSlug]',
        operation: 'loadPageBySlug',
        details: { slug },
      },
      pageQuery.error,
    );
  }

  const data = pageQuery.data;

  if (!data) return null;
  return {
    ...data,
    html_content: sanitizeCmsHtml(data.html_content ?? ''),
    css_module: sanitizeCmsCss(data.css_module ?? '', data.slug || data.kind),
  } as CmsPage;
};
