import type { GalleryPhoto } from '$lib/types/content';

export type GalleryLayoutMode =
  | 'uniform'
  | 'masonry'
  | 'coverage'
  | 'rows'
  | 'columns';

export type GalleryWidthMode = 'full' | 'constrained';

export type ActiveRoute = {
  photoSlug: string;
  imageId: string | null;
  prevGalleryHref: string | null;
  nextGalleryHref: string | null;
};

export type ViewerData = {
  galleryScope: {
    slug: string;
  } | null;
  photos: GalleryPhoto[];
  hasMore: boolean;
  page: number;
  pageSize: number;
  density: number;
  gap: number;
  q: string;
  layoutMode: GalleryLayoutMode;
  widthMode: GalleryWidthMode;
  maxContentWidthPx: number | null;
  uniformThumbRatio: number;
  maxDensity: number;
  baseQueryString: string;
  active: ActiveRoute | null;
  gallerySettings?: {
    show_photograph_info?: boolean | null;
    show_thumbnail_zoom_hover?: boolean | null;
  } | null;
};

export type GalleryImage = NonNullable<GalleryPhoto['leadImage']>;
