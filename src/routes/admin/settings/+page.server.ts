import { fail, type Actions } from '@sveltejs/kit';

import { asBoolean, asString, getCmsRole } from '$lib/server/admin-helpers';
import { throwLoaderError } from '$lib/server/load-error';
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

const typographySelect =
  'public_font_import_url, public_font_family, admin_font_import_url, admin_font_family, show_search_link_in_nav';

type TypographyValues = {
  public_font_import_url: string;
  public_font_family: string;
  admin_font_import_url: string;
  admin_font_family: string;
  show_search_link_in_nav: boolean;
};

const normalizeTypographyValues = (values: Partial<TypographyValues>) => ({
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
});

const readTypographyFormValues = (form: FormData): TypographyValues => ({
  public_font_import_url: asString(form.get('public_font_import_url')).trim(),
  public_font_family: asString(form.get('public_font_family')).trim(),
  admin_font_import_url: asString(form.get('admin_font_import_url')).trim(),
  admin_font_family: asString(form.get('admin_font_family')).trim(),
  show_search_link_in_nav: asBoolean(form.get('show_search_link_in_nav')),
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
      fieldErrors.public_font_import_url ||
      fieldErrors.admin_font_import_url ||
      fieldErrors.public_font_family ||
      fieldErrors.admin_font_family
    ) {
      return fail(400, {
        message: 'Please fix the highlighted typography fields.',
        fieldErrors,
        values,
      });
    }

    const update = await locals.supabase
      .from('site_settings')
      .update(values)
      .eq('singleton_id', 1);

    if (update.error) {
      return fail(400, {
        message: update.error.message,
        values,
      });
    }

    return { success: true, message: 'Typography settings saved.' };
  },
};
