import { fail, redirect, type Actions } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
  const { session, user } = await locals.safeGetSession();
  return {
    session,
    userEmail: user?.email ?? null
  };
};

export const actions: Actions = {
  login: async ({ locals, request }) => {
    const form = await request.formData();
    const email = String(form.get('email') ?? '').trim();
    const password = String(form.get('password') ?? '');

    if (!email || !password) {
      return fail(400, { message: 'Email and password are required.' });
    }

    const { error } = await locals.supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      return fail(400, { message: error.message });
    }

    throw redirect(303, '/admin/photos');
  },

  logout: async ({ locals }) => {
    await locals.supabase.auth.signOut();
    throw redirect(303, '/');
  }
};
