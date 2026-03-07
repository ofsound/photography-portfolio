import { fail, type Actions } from '@sveltejs/kit';
import { asBoolean, getCmsRole } from '$lib/server/admin-helpers';
import {
  loadSettingsEditor,
  saveSettingsEditor,
} from '$lib/server/admin/settings';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
  const payload = await loadSettingsEditor(locals, { kind: 'all' });
  const navQuery = await locals.supabase
    .from('gallery_settings')
    .select('show_in_nav')
    .eq('scope', 'all')
    .maybeSingle();

  if (navQuery.error) {
    throw new Error(navQuery.error.message);
  }

  return {
    ...payload,
    scopeLabel: '/all',
    allScopeNav: {
      show_in_nav: navQuery.data?.show_in_nav ?? true,
    },
  };
};

export const actions: Actions = {
  save: async ({ locals, request }) => {
    const form = await request.formData();
    try {
      await saveSettingsEditor(locals, { kind: 'all' }, form);
    } catch (cause) {
      return fail(400, {
        message:
          cause instanceof Error
            ? cause.message
            : 'Failed to save /all settings.',
      });
    }

    const role = await getCmsRole(locals);
    if (role !== 'admin') {
      return { success: true, message: '/all details saved.' };
    }

    const visibilityUpdate = await locals.supabase
      .from('gallery_settings')
      .update({ show_in_nav: asBoolean(form.get('show_in_nav')) })
      .eq('scope', 'all');

    if (visibilityUpdate.error) {
      return fail(400, {
        message: `Saved settings, but failed to save /all details: ${visibilityUpdate.error.message}`,
      });
    }

    return { success: true, message: '/all details saved.' };
  },
};
