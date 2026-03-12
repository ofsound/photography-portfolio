import { dev } from '$app/environment';
import {
  GALLERY_SETTINGS_DEFAULTS,
  type GallerySettingsDefaults,
} from '$lib/constants/gallery-settings';
import {
  DEFAULT_NAV_BUTTON_PRESET,
  normalizeNavButtonPreset,
} from '$lib/constants/nav-button-preset';
import {
  DEFAULT_PRELOADER_PRESET,
  normalizePreloaderPreset,
} from '$lib/constants/preloader-preset';
import { normalizeThumbnailEntrancePreset } from '$lib/constants/thumbnail-entrance';

import type { Database } from '$lib/types/database';

type SiteSettingsRow = Database['public']['Tables']['site_settings']['Row'];

export const GALLERY_SETTINGS_FIELD_KEYS = [
  'theme_default',
  'grid_desktop_default',
  'grid_mobile_default',
  'max_content_width_px',
  'gallery_layout_mode',
  'detail_view_mode',
  'gallery_gap_px',
  'uniform_thumb_ratio',
  'transition_preset',
  'thumbnail_entrance_preset',
  'preloader_preset',
  'nav_button_preset',
  'contact_sheet_perspective_px',
  'contact_sheet_rotate_x_deg',
  'contact_sheet_rotate_y_deg',
  'contact_sheet_travel_z_px',
  'contact_sheet_target_fill_pct',
  'contact_sheet_mobile_intensity_pct',
  'allow_transition_toggle',
  'photograph_info_mode',
  'show_photo_info_title',
  'show_photo_info_description',
  'show_photo_info_capture_date',
  'show_photo_info_dimensions',
  'show_photo_info_license_text',
  'show_photograph_info',
  'show_thumbnail_zoom_hover',
] as const satisfies ReadonlyArray<keyof SiteSettingsRow>;

export const GALLERY_SETTINGS_FIELD_SELECT =
  GALLERY_SETTINGS_FIELD_KEYS.join(', ');

export type GallerySettingsFieldKey =
  (typeof GALLERY_SETTINGS_FIELD_KEYS)[number];
export type GallerySettingsRecord = Pick<
  SiteSettingsRow,
  GallerySettingsFieldKey
>;
export type ViewerGallerySettings = {
  [K in GallerySettingsFieldKey]: GallerySettingsDefaults[K];
};

const hasText = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0;

const clampNumber = (
  value: unknown,
  fallback: number,
  min: number,
  max: number,
) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
};

const normalizeDetailViewMode = (value: unknown) =>
  value === 'contact_sheet' ? 'contact_sheet' : 'classic';

const warnPresetCoercion = (
  field: 'thumbnail_entrance_preset' | 'preloader_preset' | 'nav_button_preset',
  rawValue: unknown,
  normalizedValue: string,
  context: string,
) => {
  if (!dev || !hasText(rawValue) || rawValue === normalizedValue) return;
  console.warn(
    `[gallery-settings] Coerced invalid ${field} "${rawValue}" to "${normalizedValue}" (${context}).`,
  );
};

export const normalizeGallerySettingsForRead = (
  rawSettings: Partial<GallerySettingsRecord> | null | undefined,
  context: string,
): GallerySettingsDefaults => {
  const source = rawSettings ?? {};

  const thumbnailEntrancePreset = normalizeThumbnailEntrancePreset(
    source.thumbnail_entrance_preset ??
      GALLERY_SETTINGS_DEFAULTS.thumbnail_entrance_preset,
  );
  warnPresetCoercion(
    'thumbnail_entrance_preset',
    source.thumbnail_entrance_preset,
    thumbnailEntrancePreset,
    context,
  );

  const preloaderPreset = normalizePreloaderPreset(
    source.preloader_preset ?? DEFAULT_PRELOADER_PRESET,
  );
  warnPresetCoercion(
    'preloader_preset',
    source.preloader_preset,
    preloaderPreset,
    context,
  );

  const navButtonPreset = normalizeNavButtonPreset(
    source.nav_button_preset ?? DEFAULT_NAV_BUTTON_PRESET,
  );
  warnPresetCoercion(
    'nav_button_preset',
    source.nav_button_preset,
    navButtonPreset,
    context,
  );

  return {
    theme_default:
      source.theme_default ?? GALLERY_SETTINGS_DEFAULTS.theme_default,
    grid_desktop_default:
      source.grid_desktop_default ??
      GALLERY_SETTINGS_DEFAULTS.grid_desktop_default,
    grid_mobile_default:
      source.grid_mobile_default ??
      GALLERY_SETTINGS_DEFAULTS.grid_mobile_default,
    max_content_width_px:
      source.max_content_width_px ??
      GALLERY_SETTINGS_DEFAULTS.max_content_width_px,
    gallery_layout_mode:
      source.gallery_layout_mode ??
      GALLERY_SETTINGS_DEFAULTS.gallery_layout_mode,
    detail_view_mode: normalizeDetailViewMode(
      source.detail_view_mode ?? GALLERY_SETTINGS_DEFAULTS.detail_view_mode,
    ),
    gallery_gap_px:
      source.gallery_gap_px ?? GALLERY_SETTINGS_DEFAULTS.gallery_gap_px,
    uniform_thumb_ratio:
      source.uniform_thumb_ratio ??
      GALLERY_SETTINGS_DEFAULTS.uniform_thumb_ratio,
    transition_preset:
      source.transition_preset ?? GALLERY_SETTINGS_DEFAULTS.transition_preset,
    thumbnail_entrance_preset: thumbnailEntrancePreset,
    preloader_preset: preloaderPreset,
    nav_button_preset: navButtonPreset,
    contact_sheet_perspective_px: clampNumber(
      source.contact_sheet_perspective_px,
      GALLERY_SETTINGS_DEFAULTS.contact_sheet_perspective_px,
      200,
      4000,
    ),
    contact_sheet_rotate_x_deg: clampNumber(
      source.contact_sheet_rotate_x_deg,
      GALLERY_SETTINGS_DEFAULTS.contact_sheet_rotate_x_deg,
      0,
      45,
    ),
    contact_sheet_rotate_y_deg: clampNumber(
      source.contact_sheet_rotate_y_deg,
      GALLERY_SETTINGS_DEFAULTS.contact_sheet_rotate_y_deg,
      0,
      45,
    ),
    contact_sheet_travel_z_px: clampNumber(
      source.contact_sheet_travel_z_px,
      GALLERY_SETTINGS_DEFAULTS.contact_sheet_travel_z_px,
      0,
      1000,
    ),
    contact_sheet_target_fill_pct: clampNumber(
      source.contact_sheet_target_fill_pct,
      GALLERY_SETTINGS_DEFAULTS.contact_sheet_target_fill_pct,
      0.1,
      0.95,
    ),
    contact_sheet_mobile_intensity_pct: clampNumber(
      source.contact_sheet_mobile_intensity_pct,
      GALLERY_SETTINGS_DEFAULTS.contact_sheet_mobile_intensity_pct,
      0,
      100,
    ),
    allow_transition_toggle:
      source.allow_transition_toggle ??
      GALLERY_SETTINGS_DEFAULTS.allow_transition_toggle,
    photograph_info_mode:
      source.photograph_info_mode ??
      GALLERY_SETTINGS_DEFAULTS.photograph_info_mode,
    show_photo_info_title:
      source.show_photo_info_title ??
      GALLERY_SETTINGS_DEFAULTS.show_photo_info_title,
    show_photo_info_description:
      source.show_photo_info_description ??
      GALLERY_SETTINGS_DEFAULTS.show_photo_info_description,
    show_photo_info_capture_date:
      source.show_photo_info_capture_date ??
      GALLERY_SETTINGS_DEFAULTS.show_photo_info_capture_date,
    show_photo_info_dimensions:
      source.show_photo_info_dimensions ??
      GALLERY_SETTINGS_DEFAULTS.show_photo_info_dimensions,
    show_photo_info_license_text:
      source.show_photo_info_license_text ??
      GALLERY_SETTINGS_DEFAULTS.show_photo_info_license_text,
    show_photograph_info:
      source.show_photograph_info ??
      GALLERY_SETTINGS_DEFAULTS.show_photograph_info,
    show_thumbnail_zoom_hover:
      source.show_thumbnail_zoom_hover ??
      GALLERY_SETTINGS_DEFAULTS.show_thumbnail_zoom_hover,
  };
};

const viewerGallerySettingProjectors: {
  [K in GallerySettingsFieldKey]: (
    settings: GallerySettingsDefaults,
  ) => ViewerGallerySettings[K];
} = {
  theme_default: (settings) => settings.theme_default,
  grid_desktop_default: (settings) => settings.grid_desktop_default,
  grid_mobile_default: (settings) => settings.grid_mobile_default,
  max_content_width_px: (settings) => settings.max_content_width_px,
  gallery_layout_mode: (settings) => settings.gallery_layout_mode,
  detail_view_mode: (settings) => settings.detail_view_mode,
  gallery_gap_px: (settings) => settings.gallery_gap_px,
  uniform_thumb_ratio: (settings) => settings.uniform_thumb_ratio,
  transition_preset: (settings) => settings.transition_preset,
  thumbnail_entrance_preset: (settings) => settings.thumbnail_entrance_preset,
  preloader_preset: (settings) => settings.preloader_preset,
  nav_button_preset: (settings) => settings.nav_button_preset,
  contact_sheet_perspective_px: (settings) =>
    settings.contact_sheet_perspective_px,
  contact_sheet_rotate_x_deg: (settings) => settings.contact_sheet_rotate_x_deg,
  contact_sheet_rotate_y_deg: (settings) => settings.contact_sheet_rotate_y_deg,
  contact_sheet_travel_z_px: (settings) => settings.contact_sheet_travel_z_px,
  contact_sheet_target_fill_pct: (settings) =>
    settings.contact_sheet_target_fill_pct,
  contact_sheet_mobile_intensity_pct: (settings) =>
    settings.contact_sheet_mobile_intensity_pct,
  allow_transition_toggle: (settings) => settings.allow_transition_toggle,
  photograph_info_mode: (settings) => settings.photograph_info_mode,
  show_photo_info_title: (settings) => settings.show_photo_info_title,
  show_photo_info_description: (settings) =>
    settings.show_photo_info_description,
  show_photo_info_capture_date: (settings) =>
    settings.show_photo_info_capture_date,
  show_photo_info_dimensions: (settings) => settings.show_photo_info_dimensions,
  show_photo_info_license_text: (settings) =>
    settings.show_photo_info_license_text,
  show_photograph_info: (settings) => settings.show_photograph_info,
  show_thumbnail_zoom_hover: (settings) => settings.show_thumbnail_zoom_hover,
};

export const projectViewerGallerySettings = (
  rawSettings: Partial<GallerySettingsRecord> | null | undefined,
  context: string,
): ViewerGallerySettings => {
  const normalized = normalizeGallerySettingsForRead(rawSettings, context);
  const projectedEntries = GALLERY_SETTINGS_FIELD_KEYS.map((key) => [
    key,
    viewerGallerySettingProjectors[key](normalized),
  ]);

  return Object.fromEntries(projectedEntries) as ViewerGallerySettings;
};

export const DEFAULT_VIEWER_GALLERY_SETTINGS = projectViewerGallerySettings(
  null,
  'viewer:fallback',
);
