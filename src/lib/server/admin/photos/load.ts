import { asString } from '$lib/server/admin-helpers';
import { throwLoaderError } from '$lib/server/load-error';
import {
  isUuid,
  parseSearch,
  type PhotoImageRow,
} from '$lib/server/admin/photos/shared';

type AdminPhotosScope =
  | { kind: 'gallery'; galleryId: string; gallerySlug: string }
  | { kind: 'all' };

type GalleryRelation =
  | {
      slug: string;
      name: string;
    }
  | Array<{
      slug: string;
      name: string;
    }>
  | null;

const readGallery = (value: GalleryRelation) =>
  Array.isArray(value) ? (value[0] ?? null) : value;

export const loadAdminPhotosPage = async ({
  locals,
  url,
  scope,
}: {
  locals: App.Locals;
  url: URL;
  scope: AdminPhotosScope;
}) => {
  const showArchived = url.searchParams.get('showArchived') === '1';
  const q = asString(url.searchParams.get('q')).trim();
  const filterCategoryId = isUuid(asString(url.searchParams.get('category')))
    ? asString(url.searchParams.get('category'))
    : '';
  const filterTagId = isUuid(asString(url.searchParams.get('tag')))
    ? asString(url.searchParams.get('tag'))
    : '';
  const requestedGalleryFilter = isUuid(
    asString(url.searchParams.get('gallery')),
  )
    ? asString(url.searchParams.get('gallery'))
    : '';
  const filterGalleryId =
    scope.kind === 'gallery' ? scope.galleryId : requestedGalleryFilter;

  let photoQuery = locals.supabase
    .from('photos')
    .select(
      'id, gallery_id, slug, title, capture_date, description, dimensions, license_text, seo_title, seo_description, og_title, og_description, og_image_path, status, deleted_at, updated_at, gallery_sort_order, galleries!inner(slug, name)',
    )
    .limit(160);

  if (scope.kind === 'gallery') {
    photoQuery = photoQuery
      .eq('gallery_id', scope.galleryId)
      .order('gallery_sort_order', { ascending: true, nullsFirst: false })
      .order('updated_at', { ascending: false });
  } else {
    photoQuery = photoQuery
      .order('capture_date', { ascending: false, nullsFirst: false })
      .order('updated_at', { ascending: false });
  }

  if (showArchived) {
    photoQuery = photoQuery.not('deleted_at', 'is', null);
  } else {
    photoQuery = photoQuery.is('deleted_at', null);
  }

  if (filterGalleryId) {
    photoQuery = photoQuery.eq('gallery_id', filterGalleryId);
  }

  if (q) {
    const searchPattern = parseSearch(q);
    photoQuery = photoQuery.or(
      `title.ilike.${searchPattern},description.ilike.${searchPattern},slug.ilike.${searchPattern}`,
    );
  }

  const baseCountQuery = () => {
    let query = locals.supabase.from('photos').select('id', {
      count: 'exact',
      head: true,
    });
    if (scope.kind === 'gallery') {
      query = query.eq('gallery_id', scope.galleryId);
    }
    return query;
  };

  const [
    photosQuery,
    categoriesQuery,
    tagsQuery,
    pendingQuery,
    settingsQuery,
    activeCountQuery,
    archivedCountQuery,
    galleriesQuery,
  ] = await Promise.all([
    photoQuery,
    locals.supabase
      .from('categories')
      .select('id, name, slug, is_active')
      .order('name', { ascending: true }),
    locals.supabase
      .from('tags')
      .select('id, name, slug, is_active')
      .order('name', { ascending: true }),
    locals.supabase
      .from('photo_images')
      .select('id', { count: 'exact', head: true })
      .eq('is_active', true)
      .is('delivery_storage_path', null),
    locals.supabase
      .from('site_settings')
      .select('max_content_width_px')
      .eq('singleton_id', 1)
      .maybeSingle(),
    baseCountQuery().is('deleted_at', null),
    baseCountQuery().not('deleted_at', 'is', null),
    locals.supabase
      .from('galleries')
      .select('id, slug, name')
      .order('nav_order', { ascending: true })
      .order('name', { ascending: true }),
  ]);

  if (photosQuery.error) {
    throwLoaderError(
      {
        route:
          scope.kind === 'gallery'
            ? `/admin/${scope.gallerySlug}/photos`
            : '/admin/library',
        operation: 'load photos list',
        details: {
          showArchived,
          q: q || null,
          filterGalleryId: filterGalleryId || null,
        },
      },
      photosQuery.error,
    );
  }
  if (categoriesQuery.error) {
    throwLoaderError(
      { route: '/admin/library', operation: 'load categories' },
      categoriesQuery.error,
    );
  }
  if (tagsQuery.error) {
    throwLoaderError(
      { route: '/admin/library', operation: 'load tags' },
      tagsQuery.error,
    );
  }
  if (pendingQuery.error) {
    throwLoaderError(
      { route: '/admin/library', operation: 'load pending conversion count' },
      pendingQuery.error,
    );
  }
  if (settingsQuery.error) {
    throwLoaderError(
      { route: '/admin/library', operation: 'load site settings' },
      settingsQuery.error,
    );
  }
  if (activeCountQuery.error) {
    throwLoaderError(
      { route: '/admin/library', operation: 'load active photo count' },
      activeCountQuery.error,
    );
  }
  if (archivedCountQuery.error) {
    throwLoaderError(
      { route: '/admin/library', operation: 'load archived photo count' },
      archivedCountQuery.error,
    );
  }
  if (galleriesQuery.error) {
    throwLoaderError(
      { route: '/admin/library', operation: 'load galleries' },
      galleriesQuery.error,
    );
  }

  const photos = (photosQuery.data ?? []).map((photo) => {
    const gallery = readGallery(photo.galleries as GalleryRelation);
    return {
      ...photo,
      gallery_slug: gallery?.slug ?? 'all',
      gallery_name: gallery?.name ?? 'Unknown',
    };
  });
  const categories = categoriesQuery.data ?? [];
  const tags = tagsQuery.data ?? [];
  const settings = settingsQuery.data;
  const galleries = galleriesQuery.data ?? [];

  const photoIds = photos.map((photo: { id: string }) => photo.id);

  let photoCategories: Array<{ photo_id: string; category_id: string }> = [];
  let photoTags: Array<{ photo_id: string; tag_id: string }> = [];
  let photoImages: PhotoImageRow[] = [];

  if (photoIds.length) {
    const [categoryLinks, tagLinks, images] = await Promise.all([
      locals.supabase
        .from('photo_categories')
        .select('photo_id, category_id')
        .in('photo_id', photoIds),
      locals.supabase
        .from('photo_tags')
        .select('photo_id, tag_id')
        .in('photo_id', photoIds),
      locals.supabase
        .from('photo_images')
        .select(
          'id, photo_id, kind, position, source_storage_path, delivery_storage_path, source_mime_type, source_bytes, alt_text, dimensions, thumb_crop_x, thumb_crop_y, thumb_crop_zoom, created_at',
        )
        .in('photo_id', photoIds)
        .order('position', { ascending: true }),
    ]);

    if (categoryLinks.error) {
      throwLoaderError(
        { route: '/admin/library', operation: 'load photo_categories links' },
        categoryLinks.error,
      );
    }
    if (tagLinks.error) {
      throwLoaderError(
        { route: '/admin/library', operation: 'load photo_tags links' },
        tagLinks.error,
      );
    }
    if (images.error) {
      throwLoaderError(
        { route: '/admin/library', operation: 'load photo images' },
        images.error,
      );
    }

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

  const photoConversionStateMap: Record<
    string,
    'no-images' | 'pending' | 'ready' | 'mixed'
  > = {};

  for (const photo of photos) {
    const images = photoImageMap[photo.id] ?? [];
    const hasReady = images.some((image) =>
      Boolean(image.delivery_storage_path),
    );
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

  const filteredPhotos = photos.filter((photo) => {
    if (filterCategoryId) {
      const categoryIds = photoCategoryIds[photo.id] ?? [];
      if (!categoryIds.includes(filterCategoryId)) return false;
    }

    if (filterTagId) {
      const tagIds = photoTagIds[photo.id] ?? [];
      if (!tagIds.includes(filterTagId)) return false;
    }

    return true;
  });

  return {
    scopeKind: scope.kind,
    reorderEnabled: scope.kind === 'gallery',
    galleries,
    photos: filteredPhotos,
    categories,
    tags,
    photoCategoryIds,
    photoTagIds,
    photoImageMap,
    photoConversionStateMap,
    showArchived,
    q,
    filterCategoryId,
    filterTagId,
    filterGalleryId,
    pendingConversionCount: pendingQuery.count ?? 0,
    activeCount: activeCountQuery.count ?? 0,
    archivedCount: archivedCountQuery.count ?? 0,
    maxDensity: 20,
    maxContentWidthPx: settings?.max_content_width_px ?? null,
  };
};
