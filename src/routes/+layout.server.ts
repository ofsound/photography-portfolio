import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals }) => {
  const [{ session }, settingsResult, navPagesResult] = await Promise.all([
    locals.safeGetSession(),
    locals.supabase
      .from('site_settings')
      .select('theme_default, transition_preset, allow_transition_toggle')
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
      .order('title', { ascending: true })
  ]);

  const pendingQuery =
    session &&
    (await locals.supabase
      .from('photo_images')
      .select('id', { count: 'exact', head: true })
      .eq('is_active', true)
      .is('delivery_storage_path', null));

  return {
    session,
    siteSettings: settingsResult.data ?? null,
    navPages: navPagesResult.data ?? [],
    pendingConversionCount: pendingQuery?.count ?? 0
  };
};
