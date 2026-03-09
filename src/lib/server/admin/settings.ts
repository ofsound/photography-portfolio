import { GALLERY_SETTINGS_DEFAULTS } from '$lib/constants/gallery-settings';
import {
  asBoolean,
  asOptionalNumber,
  asString,
  getCmsRole,
} from '$lib/server/admin-helpers';
import { ensureAllSettingsSeeded } from '$lib/server/admin/galleries';

type SettingsScope =
  | { kind: 'defaults' }
  | { kind: 'all' }
  | { kind: 'gallery'; galleryId: string };

const settingsFieldSelect =
  'theme_default, grid_desktop_default, grid_mobile_default, max_content_width_px, gallery_layout_mode, gallery_gap_px, uniform_thumb_ratio, transition_preset, allow_transition_toggle, show_photograph_info, show_thumbnail_zoom_hover';

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

const readPayload = (
  form: FormData,
  role: 'admin' | 'editor',
): Record<string, unknown> => {
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
    gallery_gap_px: Math.max(
      0,
      Math.min(
        20,
        asOptionalNumber(form.get('gallery_gap_px')) ??
          GALLERY_SETTINGS_DEFAULTS.gallery_gap_px,
      ),
    ),
    uniform_thumb_ratio: Number(
      asString(
        form.get('uniform_thumb_ratio'),
        String(GALLERY_SETTINGS_DEFAULTS.uniform_thumb_ratio),
      ),
    ),
    allow_transition_toggle: asBoolean(form.get('allow_transition_toggle')),
    show_photograph_info: asBoolean(form.get('show_photograph_info')),
    show_thumbnail_zoom_hover: asBoolean(form.get('show_thumbnail_zoom_hover')),
  };

  if (role === 'admin') {
    payload.transition_preset = asTransitionPreset(
      form.get('transition_preset'),
    );
  }

  return payload;
};

const loadScopeSettings = async (locals: App.Locals, scope: SettingsScope) => {
  if (scope.kind === 'defaults') {
    const defaults = await locals.supabase
      .from('site_settings')
      .select(`singleton_id, ${settingsFieldSelect}`)
      .eq('singleton_id', 1)
      .maybeSingle();
    if (defaults.error) throw new Error(defaults.error.message);
    return defaults.data;
  }

  await ensureAllSettingsSeeded(locals);

  const query =
    scope.kind === 'all'
      ? await locals.supabase
          .from('gallery_settings')
          .select(`id, scope, gallery_id, ${settingsFieldSelect}`)
          .eq('scope', 'all')
          .maybeSingle()
      : await locals.supabase
          .from('gallery_settings')
          .select(`id, scope, gallery_id, ${settingsFieldSelect}`)
          .eq('scope', 'gallery')
          .eq('gallery_id', scope.galleryId)
          .maybeSingle();

  if (query.error) throw new Error(query.error.message);
  if (query.data) return query.data;

  const defaults = await locals.supabase
    .from('site_settings')
    .select(settingsFieldSelect)
    .eq('singleton_id', 1)
    .maybeSingle();
  if (defaults.error) throw new Error(defaults.error.message);
  if (!defaults.data) return null;

  const insert = await locals.supabase
    .from('gallery_settings')
    .insert({
      scope: scope.kind,
      gallery_id: scope.kind === 'gallery' ? scope.galleryId : null,
      ...defaults.data,
    })
    .select(`id, scope, gallery_id, ${settingsFieldSelect}`)
    .single();
  if (insert.error) throw new Error(insert.error.message);
  return insert.data;
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
