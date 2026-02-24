import { error, redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals }) => {
  const { session, user } = await locals.safeGetSession();

  if (!session || !user) {
    throw redirect(303, '/');
  }

  const { data: profile } = await locals.supabase
    .from('profiles')
    .select('role')
    .eq('user_id', user.id)
    .maybeSingle();

  if (!profile || (profile.role !== 'admin' && profile.role !== 'editor')) {
    throw error(403, 'CMS access denied');
  }

  return {
    role: profile.role,
    userEmail: user.email ?? ''
  };
};
