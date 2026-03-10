import { loadActiveNavGalleries } from '$lib/server/gallery';
import { throwLoaderError } from '$lib/server/load-error';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals }) => {
  const [
    { session, user },
    settingsResult,
    navPagesResult,
    navGalleries,
    gallerySlugsResult,
  ] = await Promise.all([
    locals.safeGetSession(),
    locals.supabase
      .from('site_settings')
      .select(
        'theme_default, transition_preset, allow_transition_toggle, show_photograph_info, show_search_link_in_nav, default_page_max_width_px, public_font_import_url, public_font_family, admin_font_import_url, admin_font_family, brand_light_hex, brand_dark_hex, brand_contrast_light_hex, brand_contrast_dark_hex',
      )
      .eq('singleton_id', 1)
      .maybeSingle(),
    locals.supabase
      .from('pages')
      .select('id, slug, title, nav_order')
      .eq('visibility_status', 'public')
      .is('deleted_at', null)
      .neq('kind', 'home')
      .order('nav_order', { ascending: true })
      .order('title', { ascending: true }),
    loadActiveNavGalleries(locals),
    locals.supabase
      .from('galleries')
      .select('slug')
      .neq('visibility_status', 'archived'),
  ]);

  let cmsRole: 'admin' | 'editor' | null = null;
  if (user) {
    const profileResult = await locals.supabase
      .from('profiles')
      .select('role')
      .eq('user_id', user.id)
      .maybeSingle();

    if (profileResult.error) {
      throwLoaderError(
        { route: '/+layout', operation: 'load cms role' },
        profileResult.error,
      );
    }

    if (
      profileResult.data?.role === 'admin' ||
      profileResult.data?.role === 'editor'
    ) {
      cmsRole = profileResult.data.role;
    }
  }

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
    cmsRole,
    siteSettings: settingsResult.data ?? null,
    navPages: navPagesResult.data ?? [],
    navGalleries,
    allGallerySlugs: (gallerySlugsResult.data ?? []).map((row) => row.slug),
    pendingConversionCount: pendingQuery?.count ?? 0,
  };
};
