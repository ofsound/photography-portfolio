export const DEFAULT_PUBLIC_FONT_IMPORT_URL =
  'https://fonts.googleapis.com/css2?family=Gabarito:wght@400..900&display=swap';
export const DEFAULT_PUBLIC_FONT_FAMILY = "'Gabarito', 'sans-serif'";

export const DEFAULT_ADMIN_FONT_IMPORT_URL =
  'https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&display=swap';
export const DEFAULT_ADMIN_FONT_FAMILY = "'Inter', 'sans-serif'";

const FONT_FAMILY_SAFE_PATTERN = /^[A-Za-z0-9 '".,-]+$/;

export const isAllowedGoogleFontsImportUrl = (value: string) => {
  try {
    const url = new URL(value);
    return (
      url.protocol === 'https:' &&
      url.hostname === 'fonts.googleapis.com' &&
      url.pathname === '/css2' &&
      url.search.length > 1
    );
  } catch {
    return false;
  }
};

export const isSafeFontFamilyDefinition = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed.length || trimmed.length > 200) return false;
  if (/[{};<>]/.test(trimmed)) return false;
  return FONT_FAMILY_SAFE_PATTERN.test(trimmed);
};

export const normalizeFontImportUrl = (value: unknown, fallback: string) => {
  const text = typeof value === 'string' ? value.trim() : '';
  return isAllowedGoogleFontsImportUrl(text) ? text : fallback;
};

export const normalizeFontFamilyDefinition = (
  value: unknown,
  fallback: string,
) => {
  const text = typeof value === 'string' ? value.trim() : '';
  return isSafeFontFamilyDefinition(text) ? text : fallback;
};
