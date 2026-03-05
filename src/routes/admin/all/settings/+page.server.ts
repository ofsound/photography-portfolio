import { fail, type Actions } from '@sveltejs/kit';
import {
  loadSettingsEditor,
  saveSettingsEditor,
} from '$lib/server/admin/settings';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
  const payload = await loadSettingsEditor(locals, { kind: 'all' });
  return {
    ...payload,
    scopeLabel: '/all',
  };
};

export const actions: Actions = {
  save: async ({ locals, request }) => {
    const form = await request.formData();
    try {
      await saveSettingsEditor(locals, { kind: 'all' }, form);
      return { success: true, message: '/all settings saved.' };
    } catch (cause) {
      return fail(400, {
        message:
          cause instanceof Error
            ? cause.message
            : 'Failed to save /all settings.',
      });
    }
  },
};
