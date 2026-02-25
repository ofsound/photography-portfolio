import { loadPageBySlug } from '$lib/server/pages';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
  const page = await loadPageBySlug(locals, 'contact');
  return {
    page:
      page ?? {
        id: '',
        slug: 'contact',
        title: 'Contact',
        html_content: '<p>Create or edit this page from Admin -> Pages using the slug "contact".</p>',
        css_module: '',
        kind: 'custom'
      }
  };
};
