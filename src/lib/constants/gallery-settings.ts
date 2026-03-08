import type { Database } from '$lib/types/database';

export type GallerySettingsDefaults = Pick<
  Database['public']['Tables']['gallery_settings']['Row'],
  | 'theme_default'
  | 'grid_desktop_default'
  | 'grid_mobile_default'
  | 'max_content_width_px'
  | 'gallery_layout_mode'
  | 'gallery_gap_px'
  | 'uniform_thumb_ratio'
  | 'transition_preset'
  | 'allow_transition_toggle'
  | 'show_search_bar'
  | 'show_photograph_info'
  | 'show_thumbnail_zoom_hover'
>;

export const GALLERY_SETTINGS_DEFAULTS: GallerySettingsDefaults = {
  theme_default: 'system',
  grid_desktop_default: 6,
  grid_mobile_default: 3,
  max_content_width_px: null,
  gallery_layout_mode: 'uniform',
  gallery_gap_px: 8,
  uniform_thumb_ratio: 1,
  transition_preset: 'cinematic',
  allow_transition_toggle: true,
  show_search_bar: true,
  show_photograph_info: true,
  show_thumbnail_zoom_hover: true,
};
