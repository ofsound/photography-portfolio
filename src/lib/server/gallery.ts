import {
  GALLERY_DETAIL_SHARED_WIDTH,
  photoPublicUrl,
} from '$lib/utils/storage-url';
import { throwLoaderError } from '$lib/server/load-error';

type GalleryPhotoNeighbors = {
  prevSlug: string | null;
  nextSlug: string | null;
};

type GalleryLoadOptions = {
  page: number;
  pageSize: number;
  q: string;
};

const maxPageSize = 120;

export const asPositiveInt = (value: string | null, fallback: number) => {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

export const normalizePageSize = (value: number) =>
  Math.max(1, Math.min(maxPageSize, value));

export const loadGalleryPage = async (
  locals: App.Locals,
  options: GalleryLoadOptions,
) => {
  const page = Math.max(1, options.page);
  const pageSize = normalizePageSize(options.pageSize);
  const start = (page - 1) * pageSize;
  const end = start + pageSize;

  let query = locals.supabase
    .from('photos')
    .select(
      'id, slug, title, description, capture_date, photo_images(id, kind, position, delivery_storage_path, alt_text, dimensions, thumb_crop_x, thumb_crop_y, thumb_crop_zoom)',
      { count: 'exact' },
    )
    .eq('status', 'published')
    .is('deleted_at', null)
    .order('capture_date', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false })
    .order('id', { ascending: false })
    .range(start, end);

  if (options.q) {
    query = query.textSearch('search_tsv', options.q, { type: 'websearch' });
  }

  const { data, error } = await query;
  if (error) {
    throwLoaderError(
      {
        route: '/(viewer)',
        operation: 'loadGalleryPage',
        details: { page, pageSize, query: options.q || null },
      },
      error,
    );
  }

  const rows = data ?? [];
  const hasMore = rows.length > pageSize;
  const pageRows = rows.slice(0, pageSize);

  const photos = pageRows.map((photo) => {
    const sortedImages = [...(photo.photo_images ?? [])]
      .filter((image) => Boolean(image.delivery_storage_path))
      .map((image) => ({
        ...image,
        delivery_storage_path: image.delivery_storage_path as string,
      }))
      .sort((a, b) => a.position - b.position);
    const lead = sortedImages.find((image) => image.kind === 'lead');
    const additionalImages = sortedImages.filter(
      (image) => image.kind === 'additional',
    );

    return {
      id: photo.id,
      slug: photo.slug,
      title: photo.title,
      description: photo.description,
      capture_date: photo.capture_date,
      thumb: lead?.delivery_storage_path
        ? photoPublicUrl(
            lead.delivery_storage_path,
            GALLERY_DETAIL_SHARED_WIDTH,
          )
        : null,
      thumbAlt: lead?.alt_text ?? photo.title,
      leadImage: lead ?? null,
      additionalImages,
    };
  });

  return { photos, hasMore };
};

export const loadGalleryPhotoNeighbors = async (
  locals: App.Locals,
  photoId: string,
): Promise<GalleryPhotoNeighbors> => {
  const { data, error } = await locals.supabase.rpc('gallery_photo_neighbors', {
    p_photo_id: photoId,
  });

  if (error) {
    throwLoaderError(
      {
        route: '/(viewer)',
        operation: 'loadGalleryPhotoNeighbors',
        details: { photoId },
      },
      error,
    );
  }

  if (!Array.isArray(data) || data.length === 0) {
    return { prevSlug: null, nextSlug: null };
  }

  const row = data[0] as
    | { prev_slug: string | null; next_slug: string | null }
    | undefined;

  return {
    prevSlug: row?.prev_slug ?? null,
    nextSlug: row?.next_slug ?? null,
  };
};
