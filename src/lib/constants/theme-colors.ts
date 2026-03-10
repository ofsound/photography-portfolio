export const DEFAULT_BRAND_LIGHT_HEX = '#4f46e5';
export const DEFAULT_BRAND_DARK_HEX = '#a5b4fc';
export const DEFAULT_BRAND_CONTRAST_LIGHT_HEX = '#eef2ff';
export const DEFAULT_BRAND_CONTRAST_DARK_HEX = '#1e1b4b';

const HEX_COLOR_PATTERN = /^#[0-9a-fA-F]{6}$/;

type BrandColorValues = {
  brand_light_hex: string;
  brand_dark_hex: string;
  brand_contrast_light_hex: string;
  brand_contrast_dark_hex: string;
};

export const isValidHexColor = (value: string) =>
  HEX_COLOR_PATTERN.test(value.trim());

export const normalizeHexColor = (value: unknown, fallback: string) => {
  const text = typeof value === 'string' ? value.trim() : '';
  return isValidHexColor(text) ? text.toLowerCase() : fallback;
};

export const normalizeBrandColorValues = (
  values: Partial<BrandColorValues>,
): BrandColorValues => ({
  brand_light_hex: normalizeHexColor(
    values.brand_light_hex,
    DEFAULT_BRAND_LIGHT_HEX,
  ),
  brand_dark_hex: normalizeHexColor(
    values.brand_dark_hex,
    DEFAULT_BRAND_DARK_HEX,
  ),
  brand_contrast_light_hex: normalizeHexColor(
    values.brand_contrast_light_hex,
    DEFAULT_BRAND_CONTRAST_LIGHT_HEX,
  ),
  brand_contrast_dark_hex: normalizeHexColor(
    values.brand_contrast_dark_hex,
    DEFAULT_BRAND_CONTRAST_DARK_HEX,
  ),
});
