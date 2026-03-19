import { redirect, type Actions } from '@sveltejs/kit';
import { superValidate, message } from 'sveltekit-superforms/server';
import { zod4 } from 'sveltekit-superforms/adapters';

import { loginSchema } from '$lib/schemas/auth';

import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
  const { session, user } = await locals.safeGetSession();
  const form = await superValidate(zod4(loginSchema));
  return {
    session,
    userEmail: user?.email ?? null,
    form,
  };
};

export const actions: Actions = {
  login: async ({ locals, request }) => {
    const form = await superValidate(request, zod4(loginSchema));
    if (!form.valid) {
      return message(
        form,
        form.errors.email?.[0] ??
          form.errors.password?.[0] ??
          'Validation failed.',
        { status: 400 },
      );
    }

    const { error } = await locals.supabase.auth.signInWithPassword({
      email: form.data.email,
      password: form.data.password,
    });

    if (error) {
      return message(form, error.message, { status: 400 });
    }

    throw redirect(303, '/admin/galleries');
  },

  logout: async ({ locals }) => {
    await locals.supabase.auth.signOut();
    throw redirect(303, '/');
  },
};
