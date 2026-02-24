import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals }) => {
  const [{ session }, settingsResult] = await Promise.all([
    locals.safeGetSession(),
    locals.supabase
      .from('site_settings')
      .select('theme_default, transition_preset, allow_transition_toggle')
      .eq('singleton_id', 1)
      .maybeSingle()
  ]);

  return {
    session,
    siteSettings: settingsResult.data ?? null
  };
};
