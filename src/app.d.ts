import type { SupabaseClient, Session, User } from '@supabase/supabase-js';
import type { Database } from '$lib/types/database';

declare global {
  namespace App {
    interface Locals {
      supabase: SupabaseClient<Database>;
      safeGetSession: () => Promise<{ session: Session | null; user: User | null }>;
    }
    interface PageData {
      session: Session | null;
      page?: { title: string; html_content: string; css_module: string; slug?: string };
      siteSettings: {
        theme_default: 'light' | 'dark' | 'system';
        transition_preset: 'cinematic' | 'snappy' | 'experimental';
        allow_transition_toggle: boolean;
      } | null;
    }
  }
}

export {};
