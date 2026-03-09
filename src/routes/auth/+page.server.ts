import { redirect, type Actions } from '@sveltejs/kit';
import { failForm } from '$lib/server/form-errors';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
  const { session, user } = await locals.safeGetSession();
  return {
    session,
    userEmail: user?.email ?? null,
  };
};

export const actions: Actions = {
  login: async ({ locals, request }) => {
    const form = await request.formData();
    const email = String(form.get('email') ?? '').trim();
    const password = String(form.get('password') ?? '');

    if (!email || !password) {
      return failForm('Email and password are required.', {
        fieldErrors: {
          email: !email ? 'Email is required.' : undefined,
          password: !password ? 'Password is required.' : undefined,
        },
        values: { email },
      });
    }

    const { error } = await locals.supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return failForm(error.message);
    }

    throw redirect(303, '/admin/galleries');
  },

  logout: async ({ locals }) => {
    await locals.supabase.auth.signOut();
    throw redirect(303, '/');
  },
};
