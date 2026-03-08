import type { GalleryVisibilityStatus } from '$lib/constants/gallery-visibility';
import { toSlug } from '$lib/server/admin-helpers';
import {
  isGallerySlugTaken,
  isPageSlugTaken,
  isReservedRootSlug,
} from '$lib/server/root-slug';

type GalleryRow = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  seo_title: string | null;
  seo_description: string | null;
  nav_order: number;
  visibility_status: GalleryVisibilityStatus;
};

const GALLERY_SELECT =
  'id, slug, name, description, seo_title, seo_description, nav_order, visibility_status';

const isGalleryVisibilityStatus = (
  value: string,
): value is GalleryVisibilityStatus =>
  value === 'public' || value === 'unlisted' || value === 'archived';

export const parseGalleryVisibilityStatus = (
  value: FormDataEntryValue | null,
): GalleryVisibilityStatus => {
  const normalized =
    typeof value === 'string' ? value.trim().toLowerCase() : '';
  return isGalleryVisibilityStatus(normalized) ? normalized : 'public';
};

const normalize = (value: string) => value.trim().toLowerCase();

const buildUniqueGallerySlug = async (
  locals: App.Locals,
  source: string,
  excludeGalleryId?: string,
) => {
  const base = toSlug(source, 'gallery');
  let candidate = base;
  let suffix = 2;

  while (suffix < 500) {
    const [pageTaken, galleryTaken] = await Promise.all([
      isPageSlugTaken(locals, candidate),
      isGallerySlugTaken(locals, candidate, excludeGalleryId),
    ]);
    const reserved = isReservedRootSlug(candidate) && candidate !== 'gallery';
    const available = !reserved && !pageTaken && !galleryTaken;
    if (available) return candidate;
    candidate = `${base}-${suffix}`;
    suffix += 1;
  }

  throw new Error('Could not generate a unique gallery slug.');
};

export const listGalleriesForAdmin = async (locals: App.Locals) => {
  const [{ data, error }, photoCounts] = await Promise.all([
    locals.supabase
      .from('galleries')
      .select(GALLERY_SELECT)
      .order('nav_order', { ascending: true })
      .order('name', { ascending: true }),
    locals.supabase
      .from('photos')
      .select('gallery_id')
      .order('gallery_id', { ascending: true }),
  ]);

  if (error) {
    throw new Error(error.message);
  }

  if (photoCounts.error) {
    throw new Error(photoCounts.error.message);
  }

  const countsByGalleryId: Record<string, number> = {};
  for (const row of photoCounts.data ?? []) {
    countsByGalleryId[row.gallery_id] =
      (countsByGalleryId[row.gallery_id] ?? 0) + 1;
  }

  return ((data ?? []) as GalleryRow[]).map((gallery) => ({
    ...gallery,
    photo_count: countsByGalleryId[gallery.id] ?? 0,
  }));
};

export const resolveGalleryForAdmin = async (
  locals: App.Locals,
  slug: string,
): Promise<
  | { kind: 'gallery'; gallery: GalleryRow }
  | { kind: 'redirect'; toSlug: string }
  | { kind: 'none' }
> => {
  const normalized = normalize(slug);
  const galleryQuery = await locals.supabase
    .from('galleries')
    .select(GALLERY_SELECT)
    .eq('slug', normalized)
    .maybeSingle();

  if (galleryQuery.error) {
    throw new Error(galleryQuery.error.message);
  }

  if (galleryQuery.data) {
    return { kind: 'gallery', gallery: galleryQuery.data as GalleryRow };
  }

  const historyQuery = await locals.supabase
    .from('gallery_slug_history')
    .select('galleries!inner(slug)')
    .eq('old_slug', normalized)
    .order('created_at', { ascending: false })
    .limit(1);

  if (historyQuery.error) {
    throw new Error(historyQuery.error.message);
  }

  const row = historyQuery.data?.[0] as
    | { galleries: { slug: string } | Array<{ slug: string }> | null }
    | undefined;
  const relation = Array.isArray(row?.galleries)
    ? row?.galleries[0]
    : row?.galleries;

  if (relation?.slug) {
    return { kind: 'redirect', toSlug: relation.slug };
  }

  return { kind: 'none' };
};

const readDefaultsTemplate = async (locals: App.Locals) => {
  const { data, error } = await locals.supabase
    .from('site_settings')
    .select(
      'theme_default, grid_desktop_default, grid_mobile_default, max_content_width_px, gallery_layout_mode, gallery_gap_px, uniform_thumb_ratio, transition_preset, allow_transition_toggle, show_search_bar, show_photograph_info, show_thumbnail_zoom_hover',
    )
    .eq('singleton_id', 1)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    throw new Error('Defaults template is missing.');
  }

  return data;
};

const seedGallerySettingsFromDefaults = async (
  locals: App.Locals,
  galleryId: string,
) => {
  const defaults = await readDefaultsTemplate(locals);
  const { error } = await locals.supabase.from('gallery_settings').insert({
    scope: 'gallery',
    gallery_id: galleryId,
    ...defaults,
  });

  if (error && error.code !== '23505') {
    throw new Error(error.message);
  }
};

export const ensureAllSettingsSeeded = async (locals: App.Locals) => {
  const existing = await locals.supabase
    .from('gallery_settings')
    .select('id')
    .eq('scope', 'all')
    .maybeSingle();

  if (existing.error) {
    throw new Error(existing.error.message);
  }

  if (existing.data) return;

  const defaults = await readDefaultsTemplate(locals);
  const insert = await locals.supabase.from('gallery_settings').insert({
    scope: 'all',
    gallery_id: null,
    ...defaults,
  });

  if (insert.error) {
    throw new Error(insert.error.message);
  }
};

export const createGalleryWithAutoSlug = async (
  locals: App.Locals,
  payload: {
    name: string;
    slugInput: string;
    description?: string | null;
    seoTitle?: string | null;
    seoDescription?: string | null;
    navOrder?: number;
    visibilityStatus?: GalleryVisibilityStatus;
  },
) => {
  const slug = await buildUniqueGallerySlug(
    locals,
    payload.slugInput || payload.name,
  );
  const { data, error } = await locals.supabase
    .from('galleries')
    .insert({
      slug,
      name: payload.name,
      description: payload.description ?? null,
      seo_title: payload.seoTitle ?? null,
      seo_description: payload.seoDescription ?? null,
      nav_order: payload.navOrder ?? 0,
      visibility_status: payload.visibilityStatus ?? 'public',
    })
    .select(GALLERY_SELECT)
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? 'Failed to create gallery.');
  }

  await seedGallerySettingsFromDefaults(locals, data.id);
  return {
    gallery: data as GalleryRow,
    slug,
  };
};

export const updateGalleryWithAutoSlug = async (
  locals: App.Locals,
  gallery: GalleryRow,
  payload: {
    name: string;
    slugInput: string;
    description?: string | null;
    seoTitle?: string | null;
    seoDescription?: string | null;
    navOrder?: number;
    visibilityStatus?: GalleryVisibilityStatus;
  },
) => {
  const requestedBase = payload.slugInput || payload.name;
  const requestedSlug = toSlug(requestedBase, 'gallery');
  const slug =
    requestedSlug === gallery.slug
      ? gallery.slug
      : await buildUniqueGallerySlug(locals, requestedBase, gallery.id);

  const { data, error } = await locals.supabase
    .from('galleries')
    .update({
      slug,
      name: payload.name,
      description: payload.description ?? null,
      seo_title: payload.seoTitle ?? null,
      seo_description: payload.seoDescription ?? null,
      nav_order: payload.navOrder ?? 0,
      visibility_status: payload.visibilityStatus ?? 'public',
    })
    .eq('id', gallery.id)
    .select(GALLERY_SELECT)
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? 'Failed to update gallery.');
  }

  return {
    gallery: data as GalleryRow,
    slug,
  };
};

const canDeleteGallery = async (locals: App.Locals, galleryId: string) => {
  const query = await locals.supabase
    .from('photos')
    .select('id', { count: 'exact', head: true })
    .eq('gallery_id', galleryId);

  if (query.error) {
    throw new Error(query.error.message);
  }

  return (query.count ?? 0) === 0;
};

export const deleteGalleryIfEmpty = async (
  locals: App.Locals,
  galleryId: string,
) => {
  const empty = await canDeleteGallery(locals, galleryId);
  if (!empty) {
    throw new Error('Gallery must be empty before deleting.');
  }

  const result = await locals.supabase
    .from('galleries')
    .delete()
    .eq('id', galleryId);
  if (result.error) {
    throw new Error(result.error.message);
  }
};

export const validateGallerySlugInput = (slugInput: string) => {
  const normalized = toSlug(slugInput, 'gallery');
  if (isReservedRootSlug(normalized) && normalized !== 'gallery') {
    return 'Slug is reserved.';
  }
  if (normalized === 'all') {
    return 'Slug "all" is reserved.';
  }
  return null;
};

export const movePhotosToGalleryWithAutoSuffix = async (
  locals: App.Locals,
  photoIds: string[],
  targetGalleryId: string,
) => {
  const seenIds: Record<string, true> = {};
  const orderedIds = photoIds.filter((id) => {
    if (seenIds[id]) return false;
    seenIds[id] = true;
    return true;
  });
  if (orderedIds.length === 0) {
    throw new Error('No photo IDs provided.');
  }

  const [sourceRows, existingRows, targetGallery] = await Promise.all([
    locals.supabase
      .from('photos')
      .select('id, slug, gallery_id')
      .in('id', orderedIds),
    locals.supabase
      .from('photos')
      .select('id, slug')
      .eq('gallery_id', targetGalleryId),
    locals.supabase
      .from('galleries')
      .select('id, slug, name')
      .eq('id', targetGalleryId)
      .maybeSingle(),
  ]);

  if (sourceRows.error) throw new Error(sourceRows.error.message);
  if (existingRows.error) throw new Error(existingRows.error.message);
  if (targetGallery.error) throw new Error(targetGallery.error.message);
  if (!targetGallery.data) throw new Error('Target gallery not found.');

  const photos = sourceRows.data ?? [];
  const sourceById = Object.fromEntries(
    photos.map((photo) => [photo.id, photo]),
  );
  const missingIds = orderedIds.filter((id) => !sourceById[id]);
  if (missingIds.length > 0) {
    throw new Error(
      `Some selected photos no longer exist (${missingIds.length} missing).`,
    );
  }

  const selectedById = Object.fromEntries(
    orderedIds.map((id) => [id, true] as const),
  );
  const usedSlugs: Record<string, true> = {};
  for (const row of existingRows.data ?? []) {
    if (selectedById[row.id]) continue;
    usedSlugs[row.slug] = true;
  }
  const plan: Array<{
    id: string;
    fromGalleryId: string;
    fromSlug: string;
    toSlug: string;
    suffixed: boolean;
  }> = [];

  for (const id of orderedIds) {
    const photo = sourceById[id];
    if (!photo) continue;

    const base = toSlug(photo.slug, 'photo');
    let candidate = base;
    let suffix = 2;
    while (usedSlugs[candidate]) {
      candidate = `${base}-${suffix}`;
      suffix += 1;
    }
    usedSlugs[candidate] = true;
    plan.push({
      id: photo.id,
      fromGalleryId: photo.gallery_id,
      fromSlug: photo.slug,
      toSlug: candidate,
      suffixed: candidate !== photo.slug,
    });
  }

  let updated = 0;
  for (const item of plan) {
    if (
      item.fromGalleryId === targetGalleryId &&
      item.toSlug === item.fromSlug
    ) {
      continue;
    }

    const update = await locals.supabase
      .from('photos')
      .update({
        gallery_id: targetGalleryId,
        slug: item.toSlug,
        updated_at: new Date().toISOString(),
      })
      .eq('id', item.id);
    if (update.error) {
      throw new Error(update.error.message);
    }
    updated += 1;
  }

  return {
    targetGallery: targetGallery.data,
    moved: plan.length,
    updated,
    suffixed: plan.filter((item) => item.suffixed),
  };
};
