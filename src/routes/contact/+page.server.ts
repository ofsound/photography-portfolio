import { loadPageByKind } from '$lib/server/pages';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
  const page = await loadPageByKind(locals, 'contact');
  return {
    page:
      page ?? {
        id: '',
        slug: 'contact',
        title: 'Contact',
        html_content: '<p>Add your Contact content from Admin → Pages.</p>',
        css_module: '',
        kind: 'contact'
      }
  };
};
