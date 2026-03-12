import type { GalleryPhoto } from '$lib/types/content';
import type { NavButtonPreset } from '$lib/constants/nav-button-preset';
import type { ThumbnailEntrancePreset } from '$lib/constants/thumbnail-entrance';
import type { PreloaderPreset } from '$lib/constants/preloader-preset';

export type GalleryLayoutMode =
  | 'uniform'
  | 'masonry'
  | 'coverage'
  | 'rows'
  | 'columns';

export type GalleryWidthMode = 'full' | 'constrained';
export type PhotographInfoMode = 'hidden' | 'floating' | 'bottom_dock';
export type DetailViewMode = 'classic' | 'contact_sheet';

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
    detail_view_mode?: DetailViewMode | null;
    thumbnail_entrance_preset?: ThumbnailEntrancePreset | null;
    preloader_preset?: PreloaderPreset | null;
    nav_button_preset?: NavButtonPreset | null;
    contact_sheet_perspective_px?: number | null;
    contact_sheet_rotate_x_deg?: number | null;
    contact_sheet_rotate_y_deg?: number | null;
    contact_sheet_travel_z_px?: number | null;
    contact_sheet_target_fill_pct?: number | null;
    contact_sheet_mobile_intensity_pct?: number | null;
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
