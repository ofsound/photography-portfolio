import { createClient } from '@supabase/supabase-js';
import { env as publicEnv } from '$env/dynamic/public';

export const GALLERY_DETAIL_SHARED_WIDTH = 2400;

let _storageClient: ReturnType<typeof createClient> | null = null;

function getStorageClient() {
  if (!_storageClient) {
    const url = publicEnv.PUBLIC_SUPABASE_URL;
    const key =
      publicEnv.PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
      publicEnv.PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) {
      throw new Error(
        'Missing PUBLIC_SUPABASE_URL and key (PUBLIC_SUPABASE_PUBLISHABLE_KEY or PUBLIC_SUPABASE_ANON_KEY)',
      );
    }
    _storageClient = createClient(url, key);
  }
  return _storageClient;
}

/**
 * Converts an og_image_path (storage path or absolute URL) to an absolute URL
 * suitable for og:image. Storage paths are resolved via photoPublicUrl;
 * paths already starting with http:// or https:// are returned as-is.
 */
export function toOgImageUrl(path: string | null | undefined): string | null {
  const p = typeof path === 'string' ? path.trim() : '';
  if (!p) return null;
  if (/^https?:\/\//i.test(p)) return p;
  return photoPublicUrl(p, 1600);
}

/**
 * Returns the public URL for an image in the photos bucket.
 * Uses Supabase client getPublicUrl for consistency and future-proofing.
 * Pass width for on-the-fly image transforms (Supabase Pro+).
 */
export function photoPublicUrl(path: string, width?: number): string {
  const supabase = getStorageClient();
  const options = width
    ? { transform: { width, quality: 82, resize: 'contain' as const } }
    : {};
  const { data } = supabase.storage.from('photos').getPublicUrl(path, options);
  return data.publicUrl;
}
