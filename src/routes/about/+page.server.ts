import { loadPageBySlug } from '$lib/server/pages';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
  const page = await loadPageBySlug(locals, 'about');
  return {
    page: page ?? {
      slug: 'about',
      title: 'About',
      editor_mode: 'code',
      html_content:
        '<p>Create or edit this page from Admin -> Pages using the slug "about".</p>',
      css_module: '',
      svedit_doc: null,
      svedit_schema_version: 1,
    },
  };
};
