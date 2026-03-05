import { RESERVED_SLUGS } from '$lib/server/reserved-slugs';

const normalize = (slug: string) => slug.trim().toLowerCase();

export const isReservedRootSlug = (slug: string) =>
  RESERVED_SLUGS.has(normalize(slug));

export const isPageSlugTaken = async (
  locals: App.Locals,
  slug: string,
  excludePageId?: string,
) => {
  let query = locals.supabase
    .from('pages')
    .select('id')
    .eq('slug', normalize(slug))
    .is('deleted_at', null)
    .limit(1);

  if (excludePageId) {
    query = query.neq('id', excludePageId);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return Boolean(data && data.length > 0);
};

export const isGallerySlugTaken = async (
  locals: App.Locals,
  slug: string,
  excludeGalleryId?: string,
) => {
  let query = locals.supabase
    .from('galleries')
    .select('id')
    .eq('slug', normalize(slug))
    .limit(1);

  if (excludeGalleryId) {
    query = query.neq('id', excludeGalleryId);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return Boolean(data && data.length > 0);
};
