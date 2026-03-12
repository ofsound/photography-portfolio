import type { SupabaseClient, Session, User } from '@supabase/supabase-js';
import type { Database } from '$lib/types/database';
import type { ThumbnailEntrancePreset } from '$lib/constants/thumbnail-entrance';
import type { PreloaderPreset } from '$lib/constants/preloader-preset';

declare global {
  namespace App {
    interface Locals {
      supabase: SupabaseClient<Database>;
      safeGetSession: () => Promise<{
        session: Session | null;
        user: User | null;
      }>;
    }
    interface PageData {
      session: Session | null;
      page?: {
        title: string;
        html_content: string;
        css_module: string;
        slug?: string;
      };
      siteSettings: {
        theme_default: 'light' | 'dark' | 'system';
        transition_preset: 'cinematic' | 'snappy' | 'experimental';
        thumbnail_entrance_preset: ThumbnailEntrancePreset;
        preloader_preset: PreloaderPreset;
        allow_transition_toggle: boolean;
        show_photograph_info: boolean;
        show_search_link_in_nav: boolean;
        default_page_max_width_px: number;
      } | null;
    }
  }
}

export {};
