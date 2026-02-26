import { env as publicEnv } from '$env/dynamic/public';

export const GALLERY_DETAIL_SHARED_WIDTH = 2400;

export const photoPublicUrl = (path: string, width?: number) => {
  const supabaseUrl = publicEnv.PUBLIC_SUPABASE_URL;
  if (!supabaseUrl) {
    throw new Error('Missing PUBLIC_SUPABASE_URL');
  }

  const base = `${supabaseUrl}/storage/v1/object/public/photos/${path}`;

  if (!width) {
    return base;
  }

  return `${supabaseUrl}/storage/v1/render/image/public/photos/${path}?width=${width}&quality=82&resize=contain`;
};
