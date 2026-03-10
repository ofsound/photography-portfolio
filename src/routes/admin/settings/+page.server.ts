import { fail, type Actions } from '@sveltejs/kit';

import {
  asBoolean,
  asOptionalNumber,
  asString,
  getCmsRole,
} from '$lib/server/admin-helpers';
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

import type { PageServerLoad } from './$types';

const DEFAULT_PAGE_MAX_WIDTH_PX = 1280;

const typographySelect =
  'public_font_import_url, public_font_family, admin_font_import_url, admin_font_family, show_search_link_in_nav, default_page_max_width_px, brand_light_hex, brand_dark_hex, brand_contrast_light_hex, brand_contrast_dark_hex';

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

type TypographyFormValues = Omit<
  TypographyValues,
  'default_page_max_width_px'
> & {
  default_page_max_width_px: number | null;
};

const normalizeDefaultPageMaxWidthPx = (value: number | null | undefined) => {
  if (Number.isInteger(value) && Number(value) > 0) {
    return Number(value);
  }
  return DEFAULT_PAGE_MAX_WIDTH_PX;
};

const normalizeTypographyValues = (
  values: Partial<TypographyFormValues>,
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

const readTypographyFormValues = (form: FormData): TypographyFormValues => ({
  public_font_import_url: asString(form.get('public_font_import_url')).trim(),
  public_font_family: asString(form.get('public_font_family')).trim(),
  admin_font_import_url: asString(form.get('admin_font_import_url')).trim(),
  admin_font_family: asString(form.get('admin_font_family')).trim(),
  show_search_link_in_nav: asBoolean(form.get('show_search_link_in_nav')),
  default_page_max_width_px: asOptionalNumber(
    form.get('default_page_max_width_px'),
  ),
  brand_light_hex: asString(form.get('brand_light_hex')).trim(),
  brand_dark_hex: asString(form.get('brand_dark_hex')).trim(),
  brand_contrast_light_hex: asString(
    form.get('brand_contrast_light_hex'),
  ).trim(),
  brand_contrast_dark_hex: asString(form.get('brand_contrast_dark_hex')).trim(),
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
      { route: '/admin/settings', operation: 'load typography settings' },
      typographyQuery.error,
    );
  }

  return {
    role,
    typography: normalizeTypographyValues(
      (typographyQuery.data ?? {}) as Partial<TypographyValues>,
    ),
  };
};

export const actions: Actions = {
  saveTypography: async ({ locals, request }) => {
    const role = await getCmsRole(locals);
    if (role !== 'admin') {
      return fail(403, {
        message: 'Only admins can update typography settings.',
      });
    }

    const form = await request.formData();
    const values = readTypographyFormValues(form);
    const fieldErrors: Record<string, string | undefined> = {};

    if (!isAllowedGoogleFontsImportUrl(values.public_font_import_url)) {
      fieldErrors.public_font_import_url = 'Must be a Google Fonts css2 URL.';
    }

    if (!isAllowedGoogleFontsImportUrl(values.admin_font_import_url)) {
      fieldErrors.admin_font_import_url = 'Must be a Google Fonts css2 URL.';
    }

    if (!isSafeFontFamilyDefinition(values.public_font_family)) {
      fieldErrors.public_font_family =
        'Invalid font-family value. Avoid CSS control characters.';
    }

    if (!isSafeFontFamilyDefinition(values.admin_font_family)) {
      fieldErrors.admin_font_family =
        'Invalid font-family value. Avoid CSS control characters.';
    }

    if (
      values.default_page_max_width_px == null ||
      !Number.isInteger(values.default_page_max_width_px) ||
      values.default_page_max_width_px <= 0
    ) {
      fieldErrors.default_page_max_width_px =
        'Must be a positive whole number.';
    }

    if (!isValidHexColor(values.brand_light_hex)) {
      fieldErrors.brand_light_hex = 'Must be a valid hex color (#RRGGBB).';
    }

    if (!isValidHexColor(values.brand_dark_hex)) {
      fieldErrors.brand_dark_hex = 'Must be a valid hex color (#RRGGBB).';
    }

    if (!isValidHexColor(values.brand_contrast_light_hex)) {
      fieldErrors.brand_contrast_light_hex =
        'Must be a valid hex color (#RRGGBB).';
    }

    if (!isValidHexColor(values.brand_contrast_dark_hex)) {
      fieldErrors.brand_contrast_dark_hex =
        'Must be a valid hex color (#RRGGBB).';
    }

    if (
      fieldErrors.public_font_import_url ||
      fieldErrors.admin_font_import_url ||
      fieldErrors.public_font_family ||
      fieldErrors.admin_font_family ||
      fieldErrors.default_page_max_width_px ||
      fieldErrors.brand_light_hex ||
      fieldErrors.brand_dark_hex ||
      fieldErrors.brand_contrast_light_hex ||
      fieldErrors.brand_contrast_dark_hex
    ) {
      return fail(400, {
        message: 'Please fix the highlighted settings fields.',
        fieldErrors,
        values,
      });
    }

    const updateValues = normalizeTypographyValues(values);

    const update = await locals.supabase
      .from('site_settings')
      .update(updateValues)
      .eq('singleton_id', 1);

    if (update.error) {
      return fail(400, {
        message: update.error.message,
        values,
      });
    }

    return { success: true, message: 'Site settings saved.' };
  },
};
