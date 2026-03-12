import type { Database } from '$lib/types/database';

export type GallerySettingsDefaults = Pick<
  Database['public']['Tables']['gallery_settings']['Row'],
  | 'theme_default'
  | 'grid_desktop_default'
  | 'grid_mobile_default'
  | 'max_content_width_px'
  | 'gallery_layout_mode'
  | 'detail_view_mode'
  | 'gallery_gap_px'
  | 'uniform_thumb_ratio'
  | 'transition_preset'
  | 'thumbnail_entrance_preset'
  | 'preloader_preset'
  | 'nav_button_preset'
  | 'contact_sheet_perspective_px'
  | 'contact_sheet_rotate_x_deg'
  | 'contact_sheet_rotate_y_deg'
  | 'contact_sheet_travel_z_px'
  | 'contact_sheet_target_fill_pct'
  | 'contact_sheet_mobile_intensity_pct'
  | 'allow_transition_toggle'
  | 'photograph_info_mode'
  | 'show_photo_info_title'
  | 'show_photo_info_description'
  | 'show_photo_info_capture_date'
  | 'show_photo_info_dimensions'
  | 'show_photo_info_license_text'
  | 'show_photograph_info'
  | 'show_thumbnail_zoom_hover'
>;

export const GALLERY_SETTINGS_DEFAULTS: GallerySettingsDefaults = {
  theme_default: 'system',
  grid_desktop_default: 6,
  grid_mobile_default: 3,
  max_content_width_px: null,
  gallery_layout_mode: 'uniform',
  detail_view_mode: 'classic',
  gallery_gap_px: 8,
  uniform_thumb_ratio: 1,
  transition_preset: 'cinematic',
  thumbnail_entrance_preset: 'cascade',
  preloader_preset: 'minimal',
  nav_button_preset: 'whisper',
  contact_sheet_perspective_px: 1200,
  contact_sheet_rotate_x_deg: 8,
  contact_sheet_rotate_y_deg: 10,
  contact_sheet_travel_z_px: 96,
  contact_sheet_target_fill_pct: 0.38,
  contact_sheet_mobile_intensity_pct: 55,
  allow_transition_toggle: true,
  photograph_info_mode: 'floating',
  show_photo_info_title: true,
  show_photo_info_description: true,
  show_photo_info_capture_date: false,
  show_photo_info_dimensions: false,
  show_photo_info_license_text: false,
  show_photograph_info: true,
  show_thumbnail_zoom_hover: true,
};
