import type { Database } from '$lib/types/database';

export type PhotoImageRow = Database['public']['Tables']['photo_images']['Row'];

export const parseSearch = (q: string) => `%${q.replace(/[%_]/g, '')}%`;

export const isUuid = (value: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

export const normalizePhotoImagePositions = async (locals: App.Locals, photoId: string) => {
  const { error } = await locals.supabase.rpc('normalize_photo_image_positions', {
    p_photo_id: photoId
  });
  if (error) return { ok: false as const, message: error.message };
  return { ok: true as const };
};
