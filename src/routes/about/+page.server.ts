import { loadPageByKind } from '$lib/server/pages';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
  const page = await loadPageByKind(locals, 'about');
  return {
    page: page ?? {
      title: 'About',
      html_content: '<p>Add your About content from Admin -> Pages.</p>',
      css_module: ''
    }
  };
};
