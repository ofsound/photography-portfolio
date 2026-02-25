import type { Database } from '$lib/types/database';

export type PhotoImageRow = Database['public']['Tables']['photo_images']['Row'];

export const parseSearch = (q: string) => `%${q.replace(/[%_]/g, '')}%`;

export const isUuid = (value: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

export const normalizePhotoImagePositions = async (locals: App.Locals, photoId: string) => {
  const { data: images, error: loadError } = await locals.supabase
    .from('photo_images')
    .select('id, kind, position')
    .eq('photo_id', photoId)
    .order('position', { ascending: true });

  if (loadError || !images) {
    return { ok: false as const, message: loadError?.message ?? 'Failed to load images for normalization.' };
  }

  if (!images.length) {
    return { ok: true as const };
  }

  let lead = images.find((image) => image.kind === 'lead') ?? null;
  if (!lead) {
    const first = images[0];
    const { error: promoteError } = await locals.supabase
      .from('photo_images')
      .update({ kind: 'lead' })
      .eq('id', first.id)
      .eq('photo_id', photoId);

    if (promoteError) return { ok: false as const, message: promoteError.message };
    lead = first;
  }

  const additional = images.filter((image) => image.id !== lead?.id).sort((a, b) => a.position - b.position);

  const stagedWrites = images.map((image, idx) =>
    locals.supabase.from('photo_images').update({ position: 100000 + idx }).eq('id', image.id).eq('photo_id', photoId)
  );
  const stagedResults = await Promise.all(stagedWrites);
  const stagedError = stagedResults.find((result) => result.error)?.error;
  if (stagedError) return { ok: false as const, message: stagedError.message };

  const finalWrites: PromiseLike<{ error: { message: string } | null }>[] = [];
  finalWrites.push(locals.supabase.from('photo_images').update({ position: 0 }).eq('id', lead.id).eq('photo_id', photoId));
  additional.forEach((image, index) => {
    finalWrites.push(
      locals.supabase.from('photo_images').update({ position: index + 1, kind: 'additional' }).eq('id', image.id).eq('photo_id', photoId)
    );
  });

  const finalResults = await Promise.all(finalWrites);
  const finalError = finalResults.find((result) => result.error)?.error;
  if (finalError) return { ok: false as const, message: finalError.message };

  return { ok: true as const };
};

