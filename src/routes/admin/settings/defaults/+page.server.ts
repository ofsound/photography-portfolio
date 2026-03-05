import { fail, type Actions } from '@sveltejs/kit';
import {
  loadSettingsEditor,
  saveSettingsEditor,
} from '$lib/server/admin/settings';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
  return loadSettingsEditor(locals, { kind: 'defaults' });
};

export const actions: Actions = {
  save: async ({ locals, request }) => {
    const form = await request.formData();
    try {
      await saveSettingsEditor(locals, { kind: 'defaults' }, form);
      return { success: true, message: 'Defaults saved.' };
    } catch (cause) {
      return fail(400, {
        message:
          cause instanceof Error ? cause.message : 'Failed to save defaults.',
      });
    }
  },
};
