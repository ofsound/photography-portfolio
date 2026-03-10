import { GALLERY_SETTINGS_DEFAULTS } from '$lib/constants/gallery-settings';
import type { GalleryVisibilityStatus } from '$lib/constants/gallery-visibility';
import { throwLoaderError } from '$lib/server/load-error';
import type { Database } from '$lib/types/database';
import { buildGalleryPhotoPath } from '$lib/utils/gallery-routes';
import {
  GALLERY_DETAIL_SHARED_WIDTH,
  photoPublicUrl,
} from '$lib/utils/storage-url';

type GalleryRow = Database['public']['Tables']['galleries']['Row'];
type SiteSettingsRow = Database['public']['Tables']['site_settings']['Row'];

type GalleryRelation = {
  slug: string;
  visibility_status?: GalleryVisibilityStatus;
} | null;

type GalleryPhotoNeighbors = {
  prevSlug: string | null;
  nextSlug: string | null;
};

type GalleryLoadOptions = {
  scope: ResolvedGalleryScope;
  page: number;
  pageSize: number;
  q: string;
};

type ImageRow = {
  id: string;
  kind: 'lead' | 'additional';
  position: number;
  delivery_storage_path: string | null;
  alt_text: string | null;
  dimensions: string | null;
  thumb_crop_x: number | null;
  thumb_crop_y: number | null;
  thumb_crop_zoom: number | null;
};

type PhotoListRow = {
  id: string;
  gallery_id: string;
  slug: string;
  title: string;
  description: string | null;
  seo_title: string | null;
  seo_description: string | null;
  og_title: string | null;
  og_description: string | null;
  og_image_path: string | null;
  capture_date: string | null;
  photo_images: ImageRow[] | null;
  galleries: GalleryRelation | GalleryRelation[] | null;
};

type CurrentPhotoRow = {
  id: string;
  slug: string;
  gallery_id: string;
  capture_date?: string | null;
  created_at?: string | null;
  galleries: GalleryRelation | GalleryRelation[] | null;
};

type HistoryPhotoRow = {
  id: string;
  slug: string;
  gallery_id: string;
  status: Database['public']['Enums']['publish_status'];
  deleted_at: string | null;
  capture_date?: string | null;
  created_at?: string | null;
  galleries: GalleryRelation | GalleryRelation[] | null;
};

type PhotoHistoryRow = {
  created_at: string;
  photos: HistoryPhotoRow | HistoryPhotoRow[] | null;
};

type SettingsFields = Pick<
  SiteSettingsRow,
  | 'theme_default'
  | 'grid_desktop_default'
  | 'grid_mobile_default'
  | 'max_content_width_px'
  | 'gallery_layout_mode'
  | 'gallery_gap_px'
  | 'uniform_thumb_ratio'
  | 'transition_preset'
  | 'allow_transition_toggle'
  | 'show_photograph_info'
  | 'show_thumbnail_zoom_hover'
>;

type BaseScope = {
  slug: string;
  name: string;
};

type GallerySettings = SettingsFields;

type ResolvedGalleryScope =
  | (BaseScope & {
      kind: 'gallery';
      id: string;
      description: string | null;
      seoTitle: string | null;
      seoDescription: string | null;
      ogTitle: string | null;
      ogDescription: string | null;
      ogImagePath: string | null;
      navOrder: number;
      visibilityStatus: GalleryVisibilityStatus;
    })
  | (BaseScope & {
      kind: 'all';
    });

type GalleryScopeResolution =
  | { kind: 'scope'; scope: ResolvedGalleryScope }
  | { kind: 'redirect'; toSlug: string }
  | { kind: 'none' };

type ResolvedPhotoIdentity = {
  id: string;
  slug: string;
  galleryId: string;
  gallerySlug: string;
};

type PhotoRouteResolution =
  | { kind: 'photo'; photo: ResolvedPhotoIdentity }
  | { kind: 'redirect'; location: string }
  | { kind: 'none' };

const maxPageSize = 120;

const gallerySettingsSelect = [
  'theme_default',
  'grid_desktop_default',
  'grid_mobile_default',
  'max_content_width_px',
  'gallery_layout_mode',
  'gallery_gap_px',
  'uniform_thumb_ratio',
  'transition_preset',
  'allow_transition_toggle',
  'show_photograph_info',
  'show_thumbnail_zoom_hover',
].join(', ');

const photoListSelect =
  'id, gallery_id, slug, title, description, seo_title, seo_description, og_title, og_description, og_image_path, capture_date, galleries(slug, visibility_status), photo_images(id, kind, position, delivery_storage_path, alt_text, dimensions, thumb_crop_x, thumb_crop_y, thumb_crop_zoom)';

const readGalleryRelation = (
  value: GalleryRelation | GalleryRelation[] | null | undefined,
): GalleryRelation => {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
};

const parsePhotoIdentity = (
  row: CurrentPhotoRow | HistoryPhotoRow | null,
): ResolvedPhotoIdentity | null => {
  if (!row) return null;
  const gallery = readGalleryRelation(row.galleries);
  if (!gallery?.slug) return null;
  return {
    id: row.id,
    slug: row.slug,
    galleryId: row.gallery_id,
    gallerySlug: gallery.slug,
  };
};

const mapPhotoRows = (rows: PhotoListRow[], fallbackGallerySlug: string) =>
  rows.map((photo) => {
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
    const gallerySlug =
      readGalleryRelation(photo.galleries)?.slug ?? fallbackGallerySlug;

    return {
      id: photo.id,
      gallery_id: photo.gallery_id,
      gallery_slug: gallerySlug,
      slug: photo.slug,
      title: photo.title,
      description: photo.description,
      seo_title: photo.seo_title,
      seo_description: photo.seo_description,
      og_title: photo.og_title,
      og_description: photo.og_description,
      og_image_path: photo.og_image_path,
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

export const asPositiveInt = (value: string | null, fallback: number) => {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

export const normalizePageSize = (value: number) =>
  Math.max(1, Math.min(maxPageSize, value));

export const resolveGalleryScope = async (
  locals: App.Locals,
  slug: string,
): Promise<GalleryScopeResolution> => {
  if (slug === 'all') {
    return {
      kind: 'scope',
      scope: {
        kind: 'all',
        slug: 'all',
        name: 'All',
      },
    };
  }

  const galleryQuery = await locals.supabase
    .from('galleries')
    .select(
      'id, slug, name, description, seo_title, seo_description, og_title, og_description, og_image_path, nav_order, visibility_status',
    )
    .eq('slug', slug)
    .maybeSingle();

  if (galleryQuery.error) {
    throwLoaderError(
      {
        route: '/[rootSlug]',
        operation: 'resolveGalleryScope current slug lookup',
        details: { slug },
      },
      galleryQuery.error,
    );
  }

  if (galleryQuery.data) {
    const gallery = galleryQuery.data as Pick<
      GalleryRow,
      | 'id'
      | 'slug'
      | 'name'
      | 'description'
      | 'seo_title'
      | 'seo_description'
      | 'og_title'
      | 'og_description'
      | 'og_image_path'
      | 'nav_order'
      | 'visibility_status'
    >;
    if (gallery.visibility_status === 'archived') {
      return { kind: 'none' };
    }
    return {
      kind: 'scope',
      scope: {
        kind: 'gallery',
        id: gallery.id,
        slug: gallery.slug,
        name: gallery.name,
        description: gallery.description,
        seoTitle: gallery.seo_title,
        seoDescription: gallery.seo_description,
        ogTitle: gallery.og_title,
        ogDescription: gallery.og_description,
        ogImagePath: gallery.og_image_path,
        navOrder: gallery.nav_order,
        visibilityStatus: gallery.visibility_status,
      },
    };
  }

  const historyQuery = await locals.supabase
    .from('gallery_slug_history')
    .select('created_at, galleries!inner(slug, visibility_status)')
    .eq('old_slug', slug)
    .order('created_at', { ascending: false })
    .limit(1);

  if (historyQuery.error) {
    throwLoaderError(
      {
        route: '/[rootSlug]',
        operation: 'resolveGalleryScope history lookup',
        details: { slug },
      },
      historyQuery.error,
    );
  }

  const row = (historyQuery.data?.[0] ?? null) as {
    galleries: GalleryRelation | GalleryRelation[] | null;
  } | null;
  const currentGallery = readGalleryRelation(row?.galleries);
  if (currentGallery?.slug && currentGallery.visibility_status !== 'archived') {
    return { kind: 'redirect', toSlug: currentGallery.slug };
  }

  return { kind: 'none' };
};

export const loadGallerySettings = async (
  locals: App.Locals,
  scope: ResolvedGalleryScope,
): Promise<GallerySettings> => {
  const settingsQuery =
    scope.kind === 'gallery'
      ? await locals.supabase
          .from('gallery_settings')
          .select(gallerySettingsSelect)
          .eq('scope', 'gallery')
          .eq('gallery_id', scope.id)
          .maybeSingle()
      : await locals.supabase
          .from('gallery_settings')
          .select(gallerySettingsSelect)
          .eq('scope', 'all')
          .maybeSingle();

  if (settingsQuery.error) {
    throwLoaderError(
      {
        route: '/[rootSlug]',
        operation: 'loadGallerySettings scoped settings',
        details: { scope: scope.slug },
      },
      settingsQuery.error,
    );
  }

  if (settingsQuery.data) {
    return settingsQuery.data as unknown as SettingsFields;
  }

  const fallbackQuery = await locals.supabase
    .from('site_settings')
    .select(gallerySettingsSelect)
    .eq('singleton_id', 1)
    .maybeSingle();

  if (fallbackQuery.error) {
    throwLoaderError(
      {
        route: '/[rootSlug]',
        operation: 'loadGallerySettings site defaults fallback',
        details: { scope: scope.slug },
      },
      fallbackQuery.error,
    );
  }

  return (fallbackQuery.data ?? GALLERY_SETTINGS_DEFAULTS) as SettingsFields;
};

export const loadActiveNavGalleries = async (locals: App.Locals) => {
  const galleriesQuery = await locals.supabase
    .from('galleries')
    .select('id, slug, name, nav_order')
    .eq('visibility_status', 'public')
    .order('nav_order', { ascending: true })
    .order('name', { ascending: true });

  if (galleriesQuery.error) {
    throwLoaderError(
      {
        route: '/+layout',
        operation: 'loadActiveNavGalleries',
      },
      galleriesQuery.error,
    );
  }

  return (
    (galleriesQuery.data ?? []) as Array<
      Pick<GalleryRow, 'id' | 'slug' | 'name' | 'nav_order'>
    >
  ).sort((a, b) => {
    if (a.nav_order !== b.nav_order) {
      return a.nav_order - b.nav_order;
    }
    return a.name.localeCompare(b.name);
  });
};

const buildPhotosQuery = (
  locals: App.Locals,
  scope: ResolvedGalleryScope,
  q: string,
  withCount: boolean,
) => {
  const selectOptions = withCount ? { count: 'exact' as const } : {};
  const baseSelect =
    scope.kind === 'all'
      ? photoListSelect.replace(
          'galleries(slug, visibility_status)',
          'galleries!inner(slug, visibility_status)',
        )
      : photoListSelect;

  let query = locals.supabase
    .from('photos')
    .select(baseSelect, selectOptions)
    .eq('status', 'published')
    .is('deleted_at', null);
  if (q) {
    query = query.textSearch('search_tsv', q, { type: 'websearch' });
  }

  if (scope.kind === 'gallery') {
    query = query
      .eq('gallery_id', scope.id)
      .order('gallery_sort_order', { ascending: true, nullsFirst: false })
      .order('capture_date', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false })
      .order('id', { ascending: false });
    return query;
  }

  query = query
    .eq('galleries.visibility_status', 'public')
    .order('capture_date', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false })
    .order('id', { ascending: false });

  return query;
};

export const loadGalleryPage = async (
  locals: App.Locals,
  options: GalleryLoadOptions,
) => {
  const page = Math.max(1, options.page);
  const pageSize = normalizePageSize(options.pageSize);
  const start = (page - 1) * pageSize;
  const end = start + pageSize;

  const query = buildPhotosQuery(locals, options.scope, options.q, true).range(
    start,
    end,
  );

  const { data, error } = await query;
  if (error) {
    throwLoaderError(
      {
        route: '/[rootSlug]',
        operation: 'loadGalleryPage',
        details: {
          scope: options.scope.slug,
          page,
          pageSize,
          query: options.q || null,
        },
      },
      error,
    );
  }

  const rows = (data ?? []) as unknown as PhotoListRow[];
  const hasMore = rows.length > pageSize;
  const pageRows = rows.slice(0, pageSize);

  return {
    photos: mapPhotoRows(pageRows, options.scope.slug),
    hasMore,
  };
};

/** Load all published photos in one query (no pagination). Used by coverage/rows/columns layout modes. */
export const loadAllGalleryPhotos = async (
  locals: App.Locals,
  scope: ResolvedGalleryScope,
  q: string,
) => {
  const query = buildPhotosQuery(locals, scope, q, false).limit(2000);

  const { data, error } = await query;
  if (error) {
    throwLoaderError(
      {
        route: '/[rootSlug]',
        operation: 'loadAllGalleryPhotos',
        details: { scope: scope.slug, query: q || null },
      },
      error,
    );
  }

  return {
    photos: mapPhotoRows((data ?? []) as unknown as PhotoListRow[], scope.slug),
    hasMore: false,
  };
};

export const loadGalleryPhotoNeighbors = async (
  locals: App.Locals,
  scope: ResolvedGalleryScope,
  photoId: string,
): Promise<GalleryPhotoNeighbors> => {
  const rpcResult =
    scope.kind === 'gallery'
      ? await locals.supabase.rpc('gallery_photo_neighbors_scoped', {
          p_gallery_id: scope.id,
          p_photo_id: photoId,
        })
      : await locals.supabase.rpc('all_photo_neighbors', {
          p_photo_id: photoId,
        });

  if (rpcResult.error) {
    throwLoaderError(
      {
        route: '/[rootSlug]',
        operation: 'loadGalleryPhotoNeighbors',
        details: { scope: scope.slug, photoId },
      },
      rpcResult.error,
    );
  }

  if (!Array.isArray(rpcResult.data) || rpcResult.data.length === 0) {
    return { prevSlug: null, nextSlug: null };
  }

  const row = rpcResult.data[0] as
    | { prev_slug: string | null; next_slug: string | null }
    | undefined;

  return {
    prevSlug: row?.prev_slug ?? null,
    nextSlug: row?.next_slug ?? null,
  };
};

const findPublishedPhotoBySlug = async (
  locals: App.Locals,
  scope: ResolvedGalleryScope,
  photoSlug: string,
): Promise<ResolvedPhotoIdentity | null> => {
  const query =
    scope.kind === 'gallery'
      ? await locals.supabase
          .from('photos')
          .select('id, slug, gallery_id, galleries!inner(slug)')
          .eq('gallery_id', scope.id)
          .eq('slug', photoSlug)
          .eq('status', 'published')
          .is('deleted_at', null)
          .limit(1)
          .maybeSingle()
      : await locals.supabase
          .from('photos')
          .select(
            'id, slug, gallery_id, capture_date, created_at, galleries!inner(slug, visibility_status)',
          )
          .eq('slug', photoSlug)
          .eq('status', 'published')
          .is('deleted_at', null)
          .eq('galleries.visibility_status', 'public')
          .order('capture_date', { ascending: false, nullsFirst: false })
          .order('created_at', { ascending: false })
          .order('id', { ascending: false })
          .limit(1)
          .maybeSingle();

  if (query.error) {
    throwLoaderError(
      {
        route: '/[rootSlug]/photo/[photoSlug]',
        operation: 'findPublishedPhotoBySlug',
        details: { scope: scope.slug, photoSlug },
      },
      query.error,
    );
  }

  return parsePhotoIdentity((query.data ?? null) as CurrentPhotoRow | null);
};

const resolveHistoryRows = (rows: PhotoHistoryRow[]) => {
  for (const row of rows) {
    const rawPhoto = Array.isArray(row.photos) ? row.photos[0] : row.photos;
    if (!rawPhoto) continue;
    if (rawPhoto.status !== 'published' || rawPhoto.deleted_at !== null) {
      continue;
    }

    const gallery = readGalleryRelation(rawPhoto.galleries);
    if (!gallery?.slug) continue;
    if (gallery.visibility_status === 'archived') continue;

    return {
      id: rawPhoto.id,
      slug: rawPhoto.slug,
      galleryId: rawPhoto.gallery_id,
      gallerySlug: gallery.slug,
    } as ResolvedPhotoIdentity;
  }

  return null;
};

const resolvePhotoSlugRedirect = async (
  locals: App.Locals,
  scope: ResolvedGalleryScope,
  oldPhotoSlug: string,
  imageId: string | null,
): Promise<string | null> => {
  const query =
    scope.kind === 'gallery'
      ? locals.supabase
          .from('photo_slug_history')
          .select(
            'created_at, photos!inner(id, slug, gallery_id, status, deleted_at, galleries!inner(slug, visibility_status))',
          )
          .eq('old_gallery_id', scope.id)
          .eq('old_slug', oldPhotoSlug)
          .order('created_at', { ascending: false })
          .limit(30)
      : locals.supabase
          .from('photo_slug_history')
          .select(
            'created_at, photos!inner(id, slug, gallery_id, status, deleted_at, capture_date, created_at, galleries!inner(slug, visibility_status))',
          )
          .eq('old_slug', oldPhotoSlug)
          .order('created_at', { ascending: false })
          .limit(60);

  const { data, error } = await query;
  if (error) {
    throwLoaderError(
      {
        route: '/[rootSlug]/photo/[photoSlug]',
        operation: 'resolvePhotoSlugRedirect',
        details: { scope: scope.slug, oldPhotoSlug },
      },
      error,
    );
  }

  const resolved = resolveHistoryRows((data ?? []) as PhotoHistoryRow[]);
  if (!resolved) return null;

  const targetGallerySlug = scope.kind === 'all' ? 'all' : resolved.gallerySlug;
  return buildGalleryPhotoPath(targetGallerySlug, resolved.slug, imageId);
};

export const resolvePhotoRoute = async (
  locals: App.Locals,
  scope: ResolvedGalleryScope,
  photoSlug: string,
  imageId: string | null,
): Promise<PhotoRouteResolution> => {
  const current = await findPublishedPhotoBySlug(locals, scope, photoSlug);
  if (current) {
    return { kind: 'photo', photo: current };
  }

  const redirectedTo = await resolvePhotoSlugRedirect(
    locals,
    scope,
    photoSlug,
    imageId,
  );
  if (redirectedTo) {
    return { kind: 'redirect', location: redirectedTo };
  }

  return { kind: 'none' };
};
