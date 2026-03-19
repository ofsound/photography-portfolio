import { fail, type Actions } from '@sveltejs/kit';
import { superValidate, message } from 'sveltekit-superforms/server';
import { zod4 } from 'sveltekit-superforms/adapters';

import { getCmsRole } from '$lib/server/admin-helpers';
import { throwLoaderError } from '$lib/server/load-error';
import {
  isValidHexColor,
  normalizeBrandColorValues,
} from '$lib/constants/theme-colors';
import {
  DEFAULT_ADMIN_FONT_FAMILY,
  DEFAULT_ADMIN_FONT_IMPORT_URL,
  DEFAULT_PUBLIC_FONT_FAMILY,
  DEFAULT_PUBLIC_FONT_IMPORT_URL,
  isAllowedGoogleFontsImportUrl,
  isSafeFontFamilyDefinition,
  normalizeFontFamilyDefinition,
  normalizeFontImportUrl,
} from '$lib/constants/typography-settings';
import { siteSettingsSchema } from '$lib/schemas/settings';

import type { PageServerLoad } from './$types';

const DEFAULT_PAGE_MAX_WIDTH_PX = 1280;
type ThemeMode = 'light' | 'dark' | 'system';

const typographySelect =
  'site_theme_default, transition_preset, gallery_theme_default_is_overridden, public_font_import_url, public_font_family, admin_font_import_url, admin_font_family, show_search_link_in_nav, default_page_max_width_px, brand_light_hex, brand_dark_hex, brand_contrast_light_hex, brand_contrast_dark_hex';

type TypographyValues = {
  public_font_import_url: string;
  public_font_family: string;
  admin_font_import_url: string;
  admin_font_family: string;
  show_search_link_in_nav: boolean;
  default_page_max_width_px: number;
  brand_light_hex: string;
  brand_dark_hex: string;
  brand_contrast_light_hex: string;
  brand_contrast_dark_hex: string;
};

const normalizeThemeMode = (
  value: string | null | undefined,
  fallback: ThemeMode = 'system',
): ThemeMode => {
  const mode = typeof value === 'string' ? value.trim() : '';
  return mode === 'light' || mode === 'dark' || mode === 'system'
    ? mode
    : fallback;
};

const normalizeTransitionPreset = (value: string | null | undefined) => {
  const preset = typeof value === 'string' ? value.trim() : '';
  return preset === 'snappy' || preset === 'experimental'
    ? preset
    : 'cinematic';
};

const normalizeDefaultPageMaxWidthPx = (value: number | null | undefined) => {
  if (Number.isInteger(value) && Number(value) > 0) {
    return Number(value);
  }
  return DEFAULT_PAGE_MAX_WIDTH_PX;
};

const normalizeTypographyValues = (
  values: Partial<{
    public_font_import_url: string;
    public_font_family: string;
    admin_font_import_url: string;
    admin_font_family: string;
    show_search_link_in_nav: boolean;
    default_page_max_width_px: number | null;
    brand_light_hex: string;
    brand_dark_hex: string;
    brand_contrast_light_hex: string;
    brand_contrast_dark_hex: string;
  }>,
): TypographyValues => ({
  public_font_import_url: normalizeFontImportUrl(
    values.public_font_import_url,
    DEFAULT_PUBLIC_FONT_IMPORT_URL,
  ),
  public_font_family: normalizeFontFamilyDefinition(
    values.public_font_family,
    DEFAULT_PUBLIC_FONT_FAMILY,
  ),
  admin_font_import_url: normalizeFontImportUrl(
    values.admin_font_import_url,
    DEFAULT_ADMIN_FONT_IMPORT_URL,
  ),
  admin_font_family: normalizeFontFamilyDefinition(
    values.admin_font_family,
    DEFAULT_ADMIN_FONT_FAMILY,
  ),
  show_search_link_in_nav: values.show_search_link_in_nav ?? true,
  default_page_max_width_px: normalizeDefaultPageMaxWidthPx(
    values.default_page_max_width_px,
  ),
  ...normalizeBrandColorValues(values),
});

export const load: PageServerLoad = async ({ locals }) => {
  const [role, typographyQuery] = await Promise.all([
    getCmsRole(locals),
    locals.supabase
      .from('site_settings')
      .select(typographySelect)
      .eq('singleton_id', 1)
      .maybeSingle(),
  ]);

  if (typographyQuery.error) {
    throwLoaderError(
      {
        route: '/admin/settings',
        operation: 'load typography settings',
      },
      typographyQuery.error,
    );
  }

  const settingsForm = await superValidate(zod4(siteSettingsSchema));

  return {
    role,
    siteThemeDefault: normalizeThemeMode(
      typographyQuery.data?.site_theme_default,
    ),
    transitionPreset: normalizeTransitionPreset(
      typographyQuery.data?.transition_preset,
    ),
    typography: normalizeTypographyValues(
      (typographyQuery.data ?? {}) as Partial<TypographyValues>,
    ),
    settingsForm,
  };
};

export const actions: Actions = {
  saveSettings: async ({ locals, request }) => {
    const role = await getCmsRole(locals);
    if (role !== 'admin' && role !== 'editor') {
      return fail(403, {
        message: 'Only admins and editors can update site settings.',
      });
    }

    const form = await superValidate(request, zod4(siteSettingsSchema));
    if (!form.valid) {
      return message(form, 'Validation failed.', { status: 400 });
    }

    const siteThemeDefault = normalizeThemeMode(form.data.site_theme_default);
    const transitionPreset = normalizeTransitionPreset(
      form.data.transition_preset,
    );

    const updateValues: Record<string, unknown> = {
      site_theme_default: siteThemeDefault,
      transition_preset: transitionPreset,
    };

    if (role === 'admin') {
      const typographyValues = {
        public_font_import_url: form.data.public_font_import_url,
        public_font_family: form.data.public_font_family,
        admin_font_import_url: form.data.admin_font_import_url,
        admin_font_family: form.data.admin_font_family,
        show_search_link_in_nav: form.data.show_search_link_in_nav,
        default_page_max_width_px: form.data.default_page_max_width_px
          ? Number(form.data.default_page_max_width_px)
          : null,
        brand_light_hex: form.data.brand_light_hex,
        brand_dark_hex: form.data.brand_dark_hex,
        brand_contrast_light_hex: form.data.brand_contrast_light_hex,
        brand_contrast_dark_hex: form.data.brand_contrast_dark_hex,
      };

      if (
        !isAllowedGoogleFontsImportUrl(typographyValues.public_font_import_url)
      ) {
        form.errors.public_font_import_url = [
          'Must be a Google Fonts css2 URL.',
        ];
      }

      if (
        !isAllowedGoogleFontsImportUrl(typographyValues.admin_font_import_url)
      ) {
        form.errors.admin_font_import_url = [
          'Must be a Google Fonts css2 URL.',
        ];
      }

      if (!isSafeFontFamilyDefinition(typographyValues.public_font_family)) {
        form.errors.public_font_family = [
          'Invalid font-family value. Avoid CSS control characters.',
        ];
      }

      if (!isSafeFontFamilyDefinition(typographyValues.admin_font_family)) {
        form.errors.admin_font_family = [
          'Invalid font-family value. Avoid CSS control characters.',
        ];
      }

      const maxWidthPx = typographyValues.default_page_max_width_px;
      if (
        maxWidthPx == null ||
        !Number.isInteger(maxWidthPx) ||
        maxWidthPx <= 0
      ) {
        form.errors.default_page_max_width_px = [
          'Must be a positive whole number.',
        ];
      }

      if (!isValidHexColor(typographyValues.brand_light_hex)) {
        form.errors.brand_light_hex = ['Must be a valid hex color (#RRGGBB).'];
      }

      if (!isValidHexColor(typographyValues.brand_dark_hex)) {
        form.errors.brand_dark_hex = ['Must be a valid hex color (#RRGGBB).'];
      }

      if (!isValidHexColor(typographyValues.brand_contrast_light_hex)) {
        form.errors.brand_contrast_light_hex = [
          'Must be a valid hex color (#RRGGBB).',
        ];
      }

      if (!isValidHexColor(typographyValues.brand_contrast_dark_hex)) {
        form.errors.brand_contrast_dark_hex = [
          'Must be a valid hex color (#RRGGBB).',
        ];
      }

      const hasErrors = Object.values(form.errors).some(
        (errs) => errs && errs.length > 0,
      );
      if (hasErrors) {
        return message(form, 'Please fix the highlighted settings fields.', {
          status: 400,
        });
      }

      const normalizedTypography = normalizeTypographyValues(typographyValues);
      Object.assign(updateValues, normalizedTypography);
    }

    const syncStateQuery = await locals.supabase
      .from('site_settings')
      .select('gallery_theme_default_is_overridden')
      .eq('singleton_id', 1)
      .maybeSingle();

    if (syncStateQuery.error) {
      return message(form, syncStateQuery.error.message, {
        status: 400,
      });
    }

    if (!syncStateQuery.data?.gallery_theme_default_is_overridden) {
      updateValues.theme_default = siteThemeDefault;
    }

    const update = await locals.supabase
      .from('site_settings')
      .update(updateValues)
      .eq('singleton_id', 1);

    if (update.error) {
      return message(form, update.error.message, { status: 400 });
    }

    return message(form, 'Site settings saved.');
  },
};
