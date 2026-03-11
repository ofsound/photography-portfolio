import type { GalleryPhoto } from '$lib/types/content';

export type GalleryLayoutMode =
  | 'uniform'
  | 'masonry'
  | 'coverage'
  | 'rows'
  | 'columns';

export type GalleryWidthMode = 'full' | 'constrained';
export type PhotographInfoMode = 'hidden' | 'floating' | 'bottom_dock';

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
  desktopDensityDefault: number;
  mobileDensityDefault: number;
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
    theme_default?: 'light' | 'dark' | 'system' | null;
    transition_preset?: 'cinematic' | 'snappy' | 'experimental' | null;
    allow_transition_toggle?: boolean | null;
    photograph_info_mode?: PhotographInfoMode | null;
    show_photo_info_title?: boolean | null;
    show_photo_info_description?: boolean | null;
    show_photo_info_capture_date?: boolean | null;
    show_photo_info_dimensions?: boolean | null;
    show_photo_info_license_text?: boolean | null;
    show_photograph_info?: boolean | null;
    show_thumbnail_zoom_hover?: boolean | null;
  } | null;
};

export type GalleryImage = NonNullable<GalleryPhoto['leadImage']>;
