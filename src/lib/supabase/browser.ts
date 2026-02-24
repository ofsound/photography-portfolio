import { env as publicEnv } from '$env/dynamic/public';
import { createBrowserClient } from '@supabase/ssr';

export const supabaseBrowser = () => {
  const supabaseUrl = publicEnv.PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = publicEnv.PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing PUBLIC_SUPABASE_URL or PUBLIC_SUPABASE_ANON_KEY');
  }

  return createBrowserClient(supabaseUrl, supabaseAnonKey);
};
