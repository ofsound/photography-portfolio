import { GALLERY_SETTINGS_DEFAULTS } from '$lib/constants/gallery-settings';
import {
  THUMBNAIL_MOTION_DURATION_MAX_MS,
  THUMBNAIL_MOTION_DURATION_MIN_MS,
  isValidCssTimingFunction,
} from '$lib/constants/thumbnail-motion';
import { normalizeNavButtonPreset } from '$lib/constants/nav-button-preset';
import { normalizePreloaderPreset } from '$lib/constants/preloader-preset';
import { normalizeThumbnailEntrancePreset } from '$lib/constants/thumbnail-entrance';
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
import type { Database } from '$lib/types/database';
import { normalizeThumbCropAspect } from '$lib/utils/thumb-crop';

type SettingsScope =
  | { kind: 'defaults' }
  | { kind: 'all' }
  | { kind: 'gallery'; galleryId: string };
type ThemeMode = 'light' | 'dark' | 'system';

type MotionFieldName =
  | 'thumbnail_promote_duration_ms'
  | 'thumbnail_promote_easing'
  | 'thumbnail_demote_duration_ms'
  | 'thumbnail_demote_easing';

type MotionOverrideValues = {
  thumbnail_promote_duration_ms: number | null;
  thumbnail_promote_easing: string | null;
  thumbnail_demote_duration_ms: number | null;
  thumbnail_demote_easing: string | null;
};

type SettingsFormValues = Record<string, string>;
type SettingsFieldErrors = Record<string, string | undefined>;

const MOTION_SELECT =
  'thumbnail_promote_duration_ms, thumbnail_promote_easing, thumbnail_demote_duration_ms, thumbnail_demote_easing';

const isThemeMode = (value: unknown): value is ThemeMode =>
  value === 'light' || value === 'dark' || value === 'system';

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

const asFloatingPanelPosition = (value: FormDataEntryValue | null) => {
  const pos = asString(value, 'bottom_left');
  return pos === 'bottom_left' || pos === 'top_right' || pos === 'bottom_right'
    ? pos
    : 'bottom_left';
};

const readFormValues = (form: FormData): SettingsFormValues => {
  const values: SettingsFormValues = {};
  for (const [key, value] of form.entries()) {
    if (typeof value === 'string') {
      values[key] = value;
    }
  }
  return values;
};

const hasFieldErrors = (fieldErrors: SettingsFieldErrors) =>
  Object.values(fieldErrors).some(Boolean);

const readDurationField = (
  raw: string,
  field: MotionFieldName,
  allowBlank: boolean,
  fieldErrors: SettingsFieldErrors,
): number | null => {
  if (!raw) {
    if (allowBlank) return null;
    fieldErrors[field] = 'Required.';
    return null;
  }

  if (!/^-?\d+$/.test(raw)) {
    fieldErrors[field] = 'Must be a whole number in milliseconds.';
    return null;
  }

  const parsed = Number(raw);
  if (!Number.isInteger(parsed)) {
    fieldErrors[field] = 'Must be a whole number in milliseconds.';
    return null;
  }

  if (
    parsed < THUMBNAIL_MOTION_DURATION_MIN_MS ||
    parsed > THUMBNAIL_MOTION_DURATION_MAX_MS
  ) {
    fieldErrors[field] =
      `Must be between ${THUMBNAIL_MOTION_DURATION_MIN_MS} and ${THUMBNAIL_MOTION_DURATION_MAX_MS} ms.`;
    return null;
  }

  return parsed;
};

const readEasingField = (
  raw: string,
  field: MotionFieldName,
  allowBlank: boolean,
  fieldErrors: SettingsFieldErrors,
): string | null => {
  if (!raw) {
    if (allowBlank) return null;
    fieldErrors[field] = 'Required.';
    return null;
  }

  if (!isValidCssTimingFunction(raw)) {
    fieldErrors[field] =
      'Must be a valid CSS timing function (for example: ease, cubic-bezier(...), steps(...), linear(...)).';
    return null;
  }

  return raw;
};

const readMotionPayload = (
  form: FormData,
  scope: SettingsScope,
  fieldErrors: SettingsFieldErrors,
  values: SettingsFormValues,
): MotionOverrideValues => {
  const allowBlank = scope.kind === 'gallery';

  const promoteDurationRaw = asString(
    form.get('thumbnail_promote_duration_ms'),
  ).trim();
  const promoteEasingRaw = asString(
    form.get('thumbnail_promote_easing'),
  ).trim();
  const demoteDurationRaw = asString(
    form.get('thumbnail_demote_duration_ms'),
  ).trim();
  const demoteEasingRaw = asString(form.get('thumbnail_demote_easing')).trim();

  values.thumbnail_promote_duration_ms = promoteDurationRaw;
  values.thumbnail_promote_easing = promoteEasingRaw;
  values.thumbnail_demote_duration_ms = demoteDurationRaw;
  values.thumbnail_demote_easing = demoteEasingRaw;

  return {
    thumbnail_promote_duration_ms: readDurationField(
      promoteDurationRaw,
      'thumbnail_promote_duration_ms',
      allowBlank,
      fieldErrors,
    ),
    thumbnail_promote_easing: readEasingField(
      promoteEasingRaw,
      'thumbnail_promote_easing',
      allowBlank,
      fieldErrors,
    ),
    thumbnail_demote_duration_ms: readDurationField(
      demoteDurationRaw,
      'thumbnail_demote_duration_ms',
      allowBlank,
      fieldErrors,
    ),
    thumbnail_demote_easing: readEasingField(
      demoteEasingRaw,
      'thumbnail_demote_easing',
      allowBlank,
      fieldErrors,
    ),
  };
};

const resolveMotionDefaults = (
  source: Partial<GallerySettingsRecord> | null | undefined,
) => ({
  thumbnail_promote_duration_ms:
    source?.thumbnail_promote_duration_ms ??
    GALLERY_SETTINGS_DEFAULTS.thumbnail_promote_duration_ms,
  thumbnail_promote_easing:
    source?.thumbnail_promote_easing ??
    GALLERY_SETTINGS_DEFAULTS.thumbnail_promote_easing,
  thumbnail_demote_duration_ms:
    source?.thumbnail_demote_duration_ms ??
    GALLERY_SETTINGS_DEFAULTS.thumbnail_demote_duration_ms,
  thumbnail_demote_easing:
    source?.thumbnail_demote_easing ??
    GALLERY_SETTINGS_DEFAULTS.thumbnail_demote_easing,
});

const extractMotionOverrides = (
  source: Partial<GallerySettingsRecord> | null | undefined,
): MotionOverrideValues => ({
  thumbnail_promote_duration_ms:
    typeof source?.thumbnail_promote_duration_ms === 'number'
      ? source.thumbnail_promote_duration_ms
      : null,
  thumbnail_promote_easing:
    typeof source?.thumbnail_promote_easing === 'string' &&
    source.thumbnail_promote_easing.trim().length > 0
      ? source.thumbnail_promote_easing
      : null,
  thumbnail_demote_duration_ms:
    typeof source?.thumbnail_demote_duration_ms === 'number'
      ? source.thumbnail_demote_duration_ms
      : null,
  thumbnail_demote_easing:
    typeof source?.thumbnail_demote_easing === 'string' &&
    source.thumbnail_demote_easing.trim().length > 0
      ? source.thumbnail_demote_easing
      : null,
});

export class SettingsValidationError extends Error {
  fieldErrors: SettingsFieldErrors;
  values: SettingsFormValues;

  constructor(
    message: string,
    fieldErrors: SettingsFieldErrors,
    values: SettingsFormValues,
  ) {
    super(message);
    this.name = 'SettingsValidationError';
    this.fieldErrors = fieldErrors;
    this.values = values;
  }
}

const readPayload = (
  form: FormData,
  role: 'admin' | 'editor',
  scope: SettingsScope,
): Record<string, unknown> => {
  const values = readFormValues(form);
  const fieldErrors: SettingsFieldErrors = {};

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
    classic_detail_border_px: clampNumber(
      asOptionalNumber(form.get('classic_detail_border_px')) ??
        GALLERY_SETTINGS_DEFAULTS.classic_detail_border_px,
      0,
      50,
      GALLERY_SETTINGS_DEFAULTS.classic_detail_border_px,
    ),
    classic_detail_h_inset_pct: clampNumber(
      asOptionalNumber(form.get('classic_detail_h_inset_pct')) ??
        GALLERY_SETTINGS_DEFAULTS.classic_detail_h_inset_pct,
      0,
      50,
      GALLERY_SETTINGS_DEFAULTS.classic_detail_h_inset_pct,
    ),
    classic_detail_v_inset_pct: clampNumber(
      asOptionalNumber(form.get('classic_detail_v_inset_pct')) ??
        GALLERY_SETTINGS_DEFAULTS.classic_detail_v_inset_pct,
      0,
      50,
      GALLERY_SETTINGS_DEFAULTS.classic_detail_v_inset_pct,
    ),
    classic_detail_v_position_pct: clampNumber(
      asOptionalNumber(form.get('classic_detail_v_position_pct')) ??
        GALLERY_SETTINGS_DEFAULTS.classic_detail_v_position_pct,
      0,
      100,
      GALLERY_SETTINGS_DEFAULTS.classic_detail_v_position_pct,
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
    uniform_thumb_ratio: normalizeThumbCropAspect(
      Number(
        asString(
          form.get('uniform_thumb_ratio'),
          String(GALLERY_SETTINGS_DEFAULTS.uniform_thumb_ratio),
        ),
      ),
    ),
    photograph_info_mode: photographInfoMode,
    floating_panel_position: asFloatingPanelPosition(
      form.get('floating_panel_position'),
    ),
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
    loop_gallery_navigation: asBoolean(form.get('loop_gallery_navigation')),
    show_photo_info_position: asBoolean(form.get('show_photo_info_position')),
  };

  if (role === 'admin') {
    payload.thumbnail_entrance_preset = asThumbnailEntrancePreset(
      form.get('thumbnail_entrance_preset'),
    );
    payload.thumbnail_entrance_stagger_ms = clampNumber(
      asOptionalNumber(form.get('thumbnail_entrance_stagger_ms')) ??
        GALLERY_SETTINGS_DEFAULTS.thumbnail_entrance_stagger_ms,
      10,
      200,
      GALLERY_SETTINGS_DEFAULTS.thumbnail_entrance_stagger_ms,
    );
    payload.thumbnail_entrance_duration_ms = clampNumber(
      asOptionalNumber(form.get('thumbnail_entrance_duration_ms')) ??
        GALLERY_SETTINGS_DEFAULTS.thumbnail_entrance_duration_ms,
      100,
      1200,
      GALLERY_SETTINGS_DEFAULTS.thumbnail_entrance_duration_ms,
    );
    payload.preloader_preset = asPreloaderPreset(form.get('preloader_preset'));
    payload.nav_button_preset = asNavButtonPreset(
      form.get('nav_button_preset'),
    );
  }

  const motionPayload = readMotionPayload(form, scope, fieldErrors, values);
  payload.thumbnail_promote_duration_ms =
    motionPayload.thumbnail_promote_duration_ms;
  payload.thumbnail_promote_easing = motionPayload.thumbnail_promote_easing;
  payload.thumbnail_demote_duration_ms =
    motionPayload.thumbnail_demote_duration_ms;
  payload.thumbnail_demote_easing = motionPayload.thumbnail_demote_easing;

  if (hasFieldErrors(fieldErrors)) {
    throw new SettingsValidationError(
      'Please fix the highlighted settings fields.',
      fieldErrors,
      values,
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
    return {
      settings: normalizeGallerySettingsForRead(
        defaults.data as Partial<GallerySettingsRecord> | null,
        'admin:defaults',
      ),
      motionOverrides: null as MotionOverrideValues | null,
    };
  }

  await ensureAllSettingsSeeded(locals);

  const settingsQueryPromise =
    scope.kind === 'all'
      ? locals.supabase
          .from('gallery_settings')
          .select(`id, scope, gallery_id, ${GALLERY_SETTINGS_FIELD_SELECT}`)
          .eq('scope', 'all')
          .maybeSingle()
      : locals.supabase
          .from('gallery_settings')
          .select(`id, scope, gallery_id, ${GALLERY_SETTINGS_FIELD_SELECT}`)
          .eq('scope', 'gallery')
          .eq('gallery_id', scope.galleryId)
          .maybeSingle();

  const defaultsMotionQueryPromise =
    scope.kind === 'gallery'
      ? locals.supabase
          .from('site_settings')
          .select(MOTION_SELECT)
          .eq('singleton_id', 1)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null });

  const [query, defaultsMotionQuery] = await Promise.all([
    settingsQueryPromise,
    defaultsMotionQueryPromise,
  ]);

  if (query.error) throw new Error(query.error.message);
  if (scope.kind === 'gallery' && defaultsMotionQuery.error) {
    throw new Error(defaultsMotionQuery.error.message);
  }

  if (query.data) {
    const scoped = query.data as Partial<GallerySettingsRecord>;
    const motionDefaults = resolveMotionDefaults(
      defaultsMotionQuery.data as Partial<GallerySettingsRecord> | null,
    );
    const merged =
      scope.kind === 'gallery'
        ? {
            ...scoped,
            thumbnail_promote_duration_ms:
              scoped.thumbnail_promote_duration_ms ??
              motionDefaults.thumbnail_promote_duration_ms,
            thumbnail_promote_easing:
              scoped.thumbnail_promote_easing ??
              motionDefaults.thumbnail_promote_easing,
            thumbnail_demote_duration_ms:
              scoped.thumbnail_demote_duration_ms ??
              motionDefaults.thumbnail_demote_duration_ms,
            thumbnail_demote_easing:
              scoped.thumbnail_demote_easing ??
              motionDefaults.thumbnail_demote_easing,
          }
        : scoped;

    return {
      settings: normalizeGallerySettingsForRead(merged, `admin:${scope.kind}`),
      motionOverrides:
        scope.kind === 'gallery' ? extractMotionOverrides(scoped) : null,
    };
  }

  const defaults = await locals.supabase
    .from('site_settings')
    .select(GALLERY_SETTINGS_FIELD_SELECT)
    .eq('singleton_id', 1)
    .maybeSingle();
  if (defaults.error) throw new Error(defaults.error.message);
  if (!defaults.data) {
    return {
      settings: null,
      motionOverrides: null,
    };
  }

  const normalizedDefaults = normalizeGallerySettingsForRead(
    defaults.data as Partial<GallerySettingsRecord>,
    `admin:fallback:${scope.kind}`,
  );

  const insertPayload: Database['public']['Tables']['gallery_settings']['Insert'] =
    {
      scope: scope.kind,
      gallery_id: scope.kind === 'gallery' ? scope.galleryId : null,
      ...normalizedDefaults,
    };

  if (scope.kind === 'gallery') {
    insertPayload.thumbnail_promote_duration_ms = null;
    insertPayload.thumbnail_promote_easing = null;
    insertPayload.thumbnail_demote_duration_ms = null;
    insertPayload.thumbnail_demote_easing = null;
  }

  const insert = await locals.supabase
    .from('gallery_settings')
    .insert(insertPayload)
    .select(`id, scope, gallery_id, ${GALLERY_SETTINGS_FIELD_SELECT}`)
    .single();
  if (insert.error) throw new Error(insert.error.message);

  const inserted = insert.data as Partial<GallerySettingsRecord>;
  const motionDefaults = resolveMotionDefaults(
    defaults.data as Partial<GallerySettingsRecord>,
  );
  const mergedInsertForRead =
    scope.kind === 'gallery'
      ? {
          ...inserted,
          thumbnail_promote_duration_ms:
            inserted.thumbnail_promote_duration_ms ??
            motionDefaults.thumbnail_promote_duration_ms,
          thumbnail_promote_easing:
            inserted.thumbnail_promote_easing ??
            motionDefaults.thumbnail_promote_easing,
          thumbnail_demote_duration_ms:
            inserted.thumbnail_demote_duration_ms ??
            motionDefaults.thumbnail_demote_duration_ms,
          thumbnail_demote_easing:
            inserted.thumbnail_demote_easing ??
            motionDefaults.thumbnail_demote_easing,
        }
      : inserted;

  return {
    settings: normalizeGallerySettingsForRead(
      mergedInsertForRead,
      `admin:seeded:${scope.kind}`,
    ),
    motionOverrides:
      scope.kind === 'gallery'
        ? {
            thumbnail_promote_duration_ms: null,
            thumbnail_promote_easing: null,
            thumbnail_demote_duration_ms: null,
            thumbnail_demote_easing: null,
          }
        : null,
  };
};

const saveScopeSettings = async (
  locals: App.Locals,
  scope: SettingsScope,
  payload: Record<string, unknown>,
) => {
  if (scope.kind === 'defaults') {
    const currentThemeQuery = await locals.supabase
      .from('site_settings')
      .select('theme_default')
      .eq('singleton_id', 1)
      .maybeSingle();
    if (currentThemeQuery.error) {
      throw new Error(currentThemeQuery.error.message);
    }

    const nextThemeValue = payload.theme_default;
    const shouldLockThemeDefault =
      isThemeMode(nextThemeValue) &&
      currentThemeQuery.data?.theme_default !== nextThemeValue;
    const updatePayload = shouldLockThemeDefault
      ? {
          ...payload,
          gallery_theme_default_is_overridden: true,
        }
      : payload;

    const update = await locals.supabase
      .from('site_settings')
      .update(updatePayload)
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
  const [settingsPayload, role] = await Promise.all([
    loadScopeSettings(locals, scope),
    getCmsRole(locals),
  ]);

  return {
    settings: settingsPayload.settings,
    motionOverrides: settingsPayload.motionOverrides,
    role,
  };
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

  const payload = readPayload(form, role, scope);
  await saveScopeSettings(locals, scope, payload);
};
