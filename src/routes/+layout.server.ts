import { loadActiveNavGalleries } from '$lib/server/gallery';
import { throwLoaderError } from '$lib/server/load-error';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals }) => {
  const [
    { session },
    settingsResult,
    navPagesResult,
    navGalleries,
    gallerySlugsResult,
  ] = await Promise.all([
    locals.safeGetSession(),
    locals.supabase
      .from('site_settings')
      .select(
        'theme_default, transition_preset, allow_transition_toggle, show_search_bar, show_photograph_info',
      )
      .eq('singleton_id', 1)
      .maybeSingle(),
    locals.supabase
      .from('pages')
      .select('id, slug, title, nav_order')
      .eq('status', 'published')
      .eq('show_in_nav', true)
      .is('deleted_at', null)
      .neq('kind', 'home')
      .order('nav_order', { ascending: true })
      .order('title', { ascending: true }),
    loadActiveNavGalleries(locals),
    locals.supabase.from('galleries').select('slug'),
  ]);

  if (settingsResult.error) {
    throwLoaderError(
      { route: '/+layout', operation: 'load site settings' },
      settingsResult.error,
    );
  }

  if (navPagesResult.error) {
    throwLoaderError(
      { route: '/+layout', operation: 'load nav pages' },
      navPagesResult.error,
    );
  }

  if (gallerySlugsResult.error) {
    throwLoaderError(
      { route: '/+layout', operation: 'load gallery slugs' },
      gallerySlugsResult.error,
    );
  }

  const pendingQuery =
    session &&
    (await locals.supabase
      .from('photo_images')
      .select('id', { count: 'exact', head: true })
      .eq('is_active', true)
      .is('delivery_storage_path', null));

  if (pendingQuery && pendingQuery.error) {
    throwLoaderError(
      { route: '/+layout', operation: 'load pending conversion count' },
      pendingQuery.error,
    );
  }

  return {
    session,
    siteSettings: settingsResult.data ?? null,
    navPages: navPagesResult.data ?? [],
    navGalleries,
    allGallerySlugs: (gallerySlugsResult.data ?? []).map((row) => row.slug),
    pendingConversionCount: pendingQuery?.count ?? 0,
  };
};
