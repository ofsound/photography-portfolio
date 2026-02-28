import { env as publicEnv } from '$env/dynamic/public';
import { createServerClient } from '@supabase/ssr';
import type { Handle } from '@sveltejs/kit';
import type { Database } from '$lib/types/database';

export const handle: Handle = async ({ event, resolve }) => {
  const supabaseUrl = publicEnv.PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = publicEnv.PUBLIC_SUPABASE_PUBLISHABLE_KEY || publicEnv.PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing PUBLIC_SUPABASE_URL and key (PUBLIC_SUPABASE_PUBLISHABLE_KEY or PUBLIC_SUPABASE_ANON_KEY)');
  }

  event.locals.supabase = createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll: () => event.cookies.getAll(),
      setAll: (cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) => {
        for (const cookie of cookiesToSet) {
          event.cookies.set(cookie.name, cookie.value, { ...cookie.options, path: '/' });
        }
      }
    }
  });

  event.locals.safeGetSession = async () => {
    const {
      data: { user },
      error: userError
    } = await event.locals.supabase.auth.getUser();

    if (userError || !user) {
      return { session: null, user: null };
    }

    const {
      data: { session },
      error: sessionError
    } = await event.locals.supabase.auth.getSession();

    if (sessionError || !session) {
      return { session: null, user: null };
    }

    return { session, user };
  };

  return resolve(event, {
    filterSerializedResponseHeaders: (name) => name === 'content-range' || name === 'x-supabase-api-version'
  });
};
