import { asString } from '$lib/server/admin-helpers';
import type { PhotoImageRow } from '$lib/server/admin/photos/shared';
import { isUuid, parseSearch } from '$lib/server/admin/photos/shared';

export const loadAdminPhotosPage = async ({ locals, url }: { locals: App.Locals; url: URL }) => {
  const showArchived = url.searchParams.get('showArchived') === '1';
  const q = asString(url.searchParams.get('q')).trim();
  const filterCategoryId = isUuid(asString(url.searchParams.get('category'))) ? asString(url.searchParams.get('category')) : '';
  const filterTagId = isUuid(asString(url.searchParams.get('tag'))) ? asString(url.searchParams.get('tag')) : '';
  const requestedConversion = asString(url.searchParams.get('conversion'), 'all');
  const filterConversion = ['all', 'pending', 'ready', 'mixed', 'no-images'].includes(requestedConversion)
    ? requestedConversion
    : 'all';

  let photoQuery = locals.supabase
    .from('photos')
    .select(
      'id, slug, title, capture_date, description, dimensions, license_text, og_title, og_description, og_image_path, status, is_searchable, deleted_at, updated_at, admin_sort_order'
    )
    .order('admin_sort_order', { ascending: true, nullsFirst: false })
    .order('updated_at', { ascending: false })
    .limit(120);

  if (!showArchived) {
    photoQuery = photoQuery.is('deleted_at', null);
  }

  if (q) {
    const searchPattern = parseSearch(q);
    photoQuery = photoQuery.or(`title.ilike.${searchPattern},description.ilike.${searchPattern},slug.ilike.${searchPattern}`);
  }

  const [
    { data: photos },
    { data: categories },
    { data: tags },
    pendingQuery,
    { data: settings }
  ] = await Promise.all([
    photoQuery,
    locals.supabase.from('categories').select('id, name, slug, is_active').order('name', { ascending: true }),
    locals.supabase.from('tags').select('id, name, slug, is_active').order('name', { ascending: true }),
    locals.supabase.from('photo_images').select('id', { count: 'exact', head: true }).eq('is_active', true).is('delivery_storage_path', null),
    locals.supabase.from('site_settings').select('grid_desktop_max, max_content_width_px').eq('singleton_id', 1).maybeSingle()
  ]);

  const photoIds = (photos ?? []).map((photo: { id: string }) => photo.id);

  let photoCategories: { photo_id: string; category_id: string }[] = [];
  let photoTags: { photo_id: string; tag_id: string }[] = [];
  let photoImages: PhotoImageRow[] = [];

  if (photoIds.length) {
    const [categoryLinks, tagLinks, images] = await Promise.all([
      locals.supabase.from('photo_categories').select('photo_id, category_id').in('photo_id', photoIds),
      locals.supabase.from('photo_tags').select('photo_id, tag_id').in('photo_id', photoIds),
      locals.supabase
        .from('photo_images')
        .select(
          'id, photo_id, kind, position, source_storage_path, delivery_storage_path, source_mime_type, source_bytes, alt_text, dimensions, thumb_crop_x, thumb_crop_y, thumb_crop_zoom, created_at'
        )
        .in('photo_id', photoIds)
        .order('position', { ascending: true })
    ]);

    photoCategories = categoryLinks.data ?? [];
    photoTags = tagLinks.data ?? [];
    photoImages = (images.data ?? []) as PhotoImageRow[];
  }

  const photoCategoryIds: Record<string, string[]> = {};
  const photoTagIds: Record<string, string[]> = {};
  const photoImageMap: Record<string, PhotoImageRow[]> = {};

  for (const link of photoCategories) {
    if (!photoCategoryIds[link.photo_id]) photoCategoryIds[link.photo_id] = [];
    photoCategoryIds[link.photo_id].push(link.category_id);
  }

  for (const link of photoTags) {
    if (!photoTagIds[link.photo_id]) photoTagIds[link.photo_id] = [];
    photoTagIds[link.photo_id].push(link.tag_id);
  }

  for (const image of photoImages) {
    if (!photoImageMap[image.photo_id]) photoImageMap[image.photo_id] = [];
    photoImageMap[image.photo_id].push(image);
  }

  const photoConversionStateMap: Record<string, 'no-images' | 'pending' | 'ready' | 'mixed'> = {};

  for (const photo of photos ?? []) {
    const images = photoImageMap[photo.id] ?? [];
    const hasReady = images.some((image) => Boolean(image.delivery_storage_path));
    const hasPending = images.some((image) => !image.delivery_storage_path);

    if (!images.length) {
      photoConversionStateMap[photo.id] = 'no-images';
    } else if (hasReady && hasPending) {
      photoConversionStateMap[photo.id] = 'mixed';
    } else if (hasPending) {
      photoConversionStateMap[photo.id] = 'pending';
    } else {
      photoConversionStateMap[photo.id] = 'ready';
    }
  }

  const filteredPhotos = (photos ?? []).filter((photo) => {
    if (filterCategoryId) {
      const categoryIds = photoCategoryIds[photo.id] ?? [];
      if (!categoryIds.includes(filterCategoryId)) return false;
    }

    if (filterTagId) {
      const tagIds = photoTagIds[photo.id] ?? [];
      if (!tagIds.includes(filterTagId)) return false;
    }

    if (filterConversion !== 'all') {
      if (photoConversionStateMap[photo.id] !== filterConversion) return false;
    }

    return true;
  });

  return {
    photos: filteredPhotos,
    categories: categories ?? [],
    tags: tags ?? [],
    photoCategoryIds,
    photoTagIds,
    photoImageMap,
    photoConversionStateMap,
    showArchived,
    q,
    filterCategoryId,
    filterTagId,
    filterConversion,
    pendingConversionCount: pendingQuery.count ?? 0,
    maxDensity: settings?.grid_desktop_max ?? 20,
    maxContentWidthPx: settings?.max_content_width_px ?? null
  };
};

