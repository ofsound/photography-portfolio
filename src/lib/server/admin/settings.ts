import { GALLERY_SETTINGS_DEFAULTS } from '$lib/constants/gallery-settings';
import { normalizeThumbnailEntrancePreset } from '$lib/constants/thumbnail-entrance';
import { normalizePreloaderPreset } from '$lib/constants/preloader-preset';
import { normalizeNavButtonPreset } from '$lib/constants/nav-button-preset';
import {
  asBoolean,
  asOptionalNumber,
  asString,
  getCmsRole,
} from '$lib/server/admin-helpers';
import { ensureAllSettingsSeeded } from '$lib/server/admin/galleries';
import {
  GALLERY_SETTINGS_FIELD_SELECT,
  normalizeGallerySettingsForRead,
  type GallerySettingsRecord,
} from '$lib/server/gallery-settings-contract';

type SettingsScope =
  | { kind: 'defaults' }
  | { kind: 'all' }
  | { kind: 'gallery'; galleryId: string };

const asThemeMode = (value: FormDataEntryValue | null) => {
  const mode = asString(value, 'system');
  return mode === 'light' || mode === 'dark' || mode === 'system'
    ? mode
    : 'system';
};

const asLayoutMode = (value: FormDataEntryValue | null) => {
  const mode = asString(value, 'uniform');
  return mode === 'uniform' ||
    mode === 'masonry' ||
    mode === 'coverage' ||
    mode === 'rows' ||
    mode === 'columns'
    ? mode
    : 'uniform';
};

const asTransitionPreset = (value: FormDataEntryValue | null) => {
  const preset = asString(value, 'cinematic');
  return preset === 'cinematic' ||
    preset === 'snappy' ||
    preset === 'experimental'
    ? preset
    : 'cinematic';
};

const asDetailViewMode = (value: FormDataEntryValue | null) => {
  const mode = asString(value, 'classic');
  return mode === 'contact_sheet' ? 'contact_sheet' : 'classic';
};

const clampNumber = (
  value: number,
  min: number,
  max: number,
  fallback: number = min,
) => {
  if (!Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, value));
};

const asThumbnailEntrancePreset = (value: FormDataEntryValue | null) =>
  normalizeThumbnailEntrancePreset(asString(value, 'cascade'));

const asPreloaderPreset = (value: FormDataEntryValue | null) =>
  normalizePreloaderPreset(asString(value, 'minimal'));

const asNavButtonPreset = (value: FormDataEntryValue | null) =>
  normalizeNavButtonPreset(asString(value, 'whisper'));

const asPhotographInfoMode = (value: FormDataEntryValue | null) => {
  const mode = asString(value, 'floating');
  return mode === 'hidden' || mode === 'floating' || mode === 'bottom_dock'
    ? mode
    : 'floating';
};

const readPayload = (
  form: FormData,
  role: 'admin' | 'editor',
): Record<string, unknown> => {
  const photographInfoMode = asPhotographInfoMode(
    form.get('photograph_info_mode'),
  );
  const payload: Record<string, unknown> = {
    theme_default: asThemeMode(form.get('theme_default')),
    grid_desktop_default:
      asOptionalNumber(form.get('grid_desktop_default')) ??
      GALLERY_SETTINGS_DEFAULTS.grid_desktop_default,
    grid_mobile_default:
      asOptionalNumber(form.get('grid_mobile_default')) ??
      GALLERY_SETTINGS_DEFAULTS.grid_mobile_default,
    max_content_width_px: asOptionalNumber(form.get('max_content_width_px')),
    gallery_layout_mode: asLayoutMode(form.get('gallery_layout_mode')),
    detail_view_mode: asDetailViewMode(form.get('detail_view_mode')),
    gallery_gap_px: Math.max(
      0,
      Math.min(
        20,
        asOptionalNumber(form.get('gallery_gap_px')) ??
          GALLERY_SETTINGS_DEFAULTS.gallery_gap_px,
      ),
    ),
    contact_sheet_perspective_px: clampNumber(
      asOptionalNumber(form.get('contact_sheet_perspective_px')) ??
        GALLERY_SETTINGS_DEFAULTS.contact_sheet_perspective_px,
      200,
      4000,
      GALLERY_SETTINGS_DEFAULTS.contact_sheet_perspective_px,
    ),
    contact_sheet_rotate_x_deg: clampNumber(
      Number(
        asString(
          form.get('contact_sheet_rotate_x_deg'),
          String(GALLERY_SETTINGS_DEFAULTS.contact_sheet_rotate_x_deg),
        ),
      ),
      0,
      45,
      GALLERY_SETTINGS_DEFAULTS.contact_sheet_rotate_x_deg,
    ),
    contact_sheet_rotate_y_deg: clampNumber(
      Number(
        asString(
          form.get('contact_sheet_rotate_y_deg'),
          String(GALLERY_SETTINGS_DEFAULTS.contact_sheet_rotate_y_deg),
        ),
      ),
      0,
      45,
      GALLERY_SETTINGS_DEFAULTS.contact_sheet_rotate_y_deg,
    ),
    contact_sheet_travel_z_px: clampNumber(
      asOptionalNumber(form.get('contact_sheet_travel_z_px')) ??
        GALLERY_SETTINGS_DEFAULTS.contact_sheet_travel_z_px,
      0,
      1000,
      GALLERY_SETTINGS_DEFAULTS.contact_sheet_travel_z_px,
    ),
    contact_sheet_target_fill_pct: clampNumber(
      Number(
        asString(
          form.get('contact_sheet_target_fill_pct'),
          String(GALLERY_SETTINGS_DEFAULTS.contact_sheet_target_fill_pct),
        ),
      ),
      0.1,
      0.95,
      GALLERY_SETTINGS_DEFAULTS.contact_sheet_target_fill_pct,
    ),
    contact_sheet_mobile_intensity_pct: clampNumber(
      asOptionalNumber(form.get('contact_sheet_mobile_intensity_pct')) ??
        GALLERY_SETTINGS_DEFAULTS.contact_sheet_mobile_intensity_pct,
      0,
      100,
      GALLERY_SETTINGS_DEFAULTS.contact_sheet_mobile_intensity_pct,
    ),
    uniform_thumb_ratio: Number(
      asString(
        form.get('uniform_thumb_ratio'),
        String(GALLERY_SETTINGS_DEFAULTS.uniform_thumb_ratio),
      ),
    ),
    allow_transition_toggle: asBoolean(form.get('allow_transition_toggle')),
    photograph_info_mode: photographInfoMode,
    show_photo_info_title: asBoolean(form.get('show_photo_info_title')),
    show_photo_info_description: asBoolean(
      form.get('show_photo_info_description'),
    ),
    show_photo_info_capture_date: asBoolean(
      form.get('show_photo_info_capture_date'),
    ),
    show_photo_info_dimensions: asBoolean(
      form.get('show_photo_info_dimensions'),
    ),
    show_photo_info_license_text: asBoolean(
      form.get('show_photo_info_license_text'),
    ),
    show_photograph_info: photographInfoMode !== 'hidden',
    show_thumbnail_zoom_hover: asBoolean(form.get('show_thumbnail_zoom_hover')),
  };

  if (role === 'admin') {
    payload.transition_preset = asTransitionPreset(
      form.get('transition_preset'),
    );
    payload.thumbnail_entrance_preset = asThumbnailEntrancePreset(
      form.get('thumbnail_entrance_preset'),
    );
    payload.preloader_preset = asPreloaderPreset(form.get('preloader_preset'));
    payload.nav_button_preset = asNavButtonPreset(
      form.get('nav_button_preset'),
    );
  }

  return payload;
};

const loadScopeSettings = async (locals: App.Locals, scope: SettingsScope) => {
  if (scope.kind === 'defaults') {
    const defaults = await locals.supabase
      .from('site_settings')
      .select(`singleton_id, ${GALLERY_SETTINGS_FIELD_SELECT}`)
      .eq('singleton_id', 1)
      .maybeSingle();
    if (defaults.error) throw new Error(defaults.error.message);
    return normalizeGallerySettingsForRead(
      defaults.data as Partial<GallerySettingsRecord> | null,
      'admin:defaults',
    );
  }

  await ensureAllSettingsSeeded(locals);

  const query =
    scope.kind === 'all'
      ? await locals.supabase
          .from('gallery_settings')
          .select(`id, scope, gallery_id, ${GALLERY_SETTINGS_FIELD_SELECT}`)
          .eq('scope', 'all')
          .maybeSingle()
      : await locals.supabase
          .from('gallery_settings')
          .select(`id, scope, gallery_id, ${GALLERY_SETTINGS_FIELD_SELECT}`)
          .eq('scope', 'gallery')
          .eq('gallery_id', scope.galleryId)
          .maybeSingle();

  if (query.error) throw new Error(query.error.message);
  if (query.data) {
    return normalizeGallerySettingsForRead(
      query.data as Partial<GallerySettingsRecord>,
      `admin:${scope.kind}`,
    );
  }

  const defaults = await locals.supabase
    .from('site_settings')
    .select(GALLERY_SETTINGS_FIELD_SELECT)
    .eq('singleton_id', 1)
    .maybeSingle();
  if (defaults.error) throw new Error(defaults.error.message);
  if (!defaults.data) return null;

  const normalizedDefaults = normalizeGallerySettingsForRead(
    defaults.data as Partial<GallerySettingsRecord>,
    `admin:fallback:${scope.kind}`,
  );

  const insert = await locals.supabase
    .from('gallery_settings')
    .insert({
      scope: scope.kind,
      gallery_id: scope.kind === 'gallery' ? scope.galleryId : null,
      ...normalizedDefaults,
    })
    .select(`id, scope, gallery_id, ${GALLERY_SETTINGS_FIELD_SELECT}`)
    .single();
  if (insert.error) throw new Error(insert.error.message);
  return normalizeGallerySettingsForRead(
    insert.data as Partial<GallerySettingsRecord>,
    `admin:seeded:${scope.kind}`,
  );
};

const saveScopeSettings = async (
  locals: App.Locals,
  scope: SettingsScope,
  payload: Record<string, unknown>,
) => {
  if (scope.kind === 'defaults') {
    const update = await locals.supabase
      .from('site_settings')
      .update(payload)
      .eq('singleton_id', 1);
    if (update.error) throw new Error(update.error.message);
    return;
  }

  const update =
    scope.kind === 'all'
      ? await locals.supabase
          .from('gallery_settings')
          .update(payload)
          .eq('scope', 'all')
      : await locals.supabase
          .from('gallery_settings')
          .update(payload)
          .eq('scope', 'gallery')
          .eq('gallery_id', scope.galleryId);
  if (update.error) throw new Error(update.error.message);
};

export const loadSettingsEditor = async (
  locals: App.Locals,
  scope: SettingsScope,
) => {
  const [settings, role] = await Promise.all([
    loadScopeSettings(locals, scope),
    getCmsRole(locals),
  ]);

  return { settings, role };
};

export const saveSettingsEditor = async (
  locals: App.Locals,
  scope: SettingsScope,
  form: FormData,
) => {
  const role = await getCmsRole(locals);
  if (!role) {
    throw new Error('Unauthorized.');
  }

  const payload = readPayload(form, role);
  await saveScopeSettings(locals, scope, payload);
};
