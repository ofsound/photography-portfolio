import { fail, type Actions } from '@sveltejs/kit';
import {
  asBoolean,
  asOptionalNumber,
  asString,
  getCmsRole,
} from '$lib/server/admin-helpers';
import { throwLoaderError } from '$lib/server/load-error';
import type { PageServerLoad } from './$types';

const asThemeMode = (value: FormDataEntryValue | null) => {
  const mode = asString(value, 'system');
  return mode === 'light' || mode === 'dark' || mode === 'system'
    ? mode
    : 'system';
};

const asLayoutMode = (value: FormDataEntryValue | null) => {
  const mode = asString(value, 'uniform');
  return mode === 'uniform' || mode === 'masonry' ? mode : 'uniform';
};

const asTransitionPreset = (value: FormDataEntryValue | null) => {
  const preset = asString(value, 'cinematic');
  return preset === 'cinematic' ||
    preset === 'snappy' ||
    preset === 'experimental'
    ? preset
    : 'cinematic';
};

export const load: PageServerLoad = async ({ locals }) => {
  const [settingsQuery, role] = await Promise.all([
    locals.supabase
      .from('site_settings')
      .select(
        'singleton_id, theme_default, grid_desktop_default, grid_mobile_default, max_content_width_px, gallery_layout_mode, gallery_gap_px, uniform_thumb_ratio, transition_preset, allow_transition_toggle, show_search_bar, show_photograph_info',
      )
      .eq('singleton_id', 1)
      .maybeSingle(),
    getCmsRole(locals),
  ]);

  if (settingsQuery.error) {
    throwLoaderError(
      { route: '/admin/settings', operation: 'load site settings' },
      settingsQuery.error,
    );
  }

  return {
    settings: settingsQuery.data,
    role,
  };
};

export const actions: Actions = {
  save: async ({ locals, request }) => {
    const form = await request.formData();
    const role = await getCmsRole(locals);

    if (!role) {
      return fail(403, { message: 'Unauthorized.' });
    }

    const updatePayload: Record<string, unknown> = {
      theme_default: asThemeMode(form.get('theme_default')),
      grid_desktop_default:
        asOptionalNumber(form.get('grid_desktop_default')) ?? 6,
      grid_mobile_default:
        asOptionalNumber(form.get('grid_mobile_default')) ?? 3,
      max_content_width_px: asOptionalNumber(form.get('max_content_width_px')),
      gallery_layout_mode: asLayoutMode(form.get('gallery_layout_mode')),
      gallery_gap_px: Math.max(
        0,
        Math.min(20, asOptionalNumber(form.get('gallery_gap_px')) ?? 8),
      ),
      uniform_thumb_ratio: Number(
        asString(form.get('uniform_thumb_ratio'), '1'),
      ),
      allow_transition_toggle: asBoolean(form.get('allow_transition_toggle')),
      show_search_bar: asBoolean(form.get('show_search_bar')),
      show_photograph_info: asBoolean(form.get('show_photograph_info')),
    };

    if (role === 'admin') {
      updatePayload.transition_preset = asTransitionPreset(
        form.get('transition_preset'),
      );
    }

    const { error } = await locals.supabase
      .from('site_settings')
      .update(updatePayload)
      .eq('singleton_id', 1);

    if (error) {
      return fail(400, { message: error.message });
    }

    return { success: true, message: 'Settings saved.' };
  },
};
