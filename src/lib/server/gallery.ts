import { photoPublicUrl } from '$lib/utils/storage-url';
import { transitionNameForImage } from '$lib/utils/view-transition';

export type GalleryPhotoCard = {
  id: string;
  slug: string;
  title: string;
  capture_date: string | null;
  thumb: string | null;
  thumbAlt: string;
  transitionName: string | null;
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

export const normalizePageSize = (value: number) => Math.max(1, Math.min(maxPageSize, value));

export const loadGalleryPage = async (locals: App.Locals, options: GalleryLoadOptions) => {
  const page = Math.max(1, options.page);
  const pageSize = normalizePageSize(options.pageSize);
  const start = (page - 1) * pageSize;
  const end = start + pageSize;

  let query = locals.supabase
    .from('photos')
    .select(
      'id, slug, title, capture_date, photo_images(id, kind, position, delivery_storage_path, alt_text)',
      { count: 'exact' }
    )
    .eq('status', 'published')
    .is('deleted_at', null)
    .order('capture_date', { ascending: false, nullsFirst: false })
    .range(start, end);

  if (options.q) {
    query = query.textSearch('search_tsv', options.q, { type: 'websearch' });
  }

  const { data, error } = await query;
  if (error) {
    return { photos: [] as GalleryPhotoCard[], hasMore: false };
  }

  const rows = data ?? [];
  const hasMore = rows.length > pageSize;
  const pageRows = rows.slice(0, pageSize);

  const photos = pageRows.map((photo) => {
    const lead = [...(photo.photo_images ?? [])]
      .sort((a, b) => a.position - b.position)
      .find((image) => image.kind === 'lead');

    return {
      id: photo.id,
      slug: photo.slug,
      title: photo.title,
      capture_date: photo.capture_date,
      thumb: lead?.delivery_storage_path ? photoPublicUrl(lead.delivery_storage_path, 720) : null,
      thumbAlt: lead?.alt_text ?? photo.title,
      transitionName: transitionNameForImage(lead?.id)
    };
  });

  return { photos, hasMore };
};
