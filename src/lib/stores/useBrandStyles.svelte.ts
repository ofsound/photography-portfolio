import {
  DEFAULT_BRAND_CONTRAST_DARK_HEX,
  DEFAULT_BRAND_CONTRAST_LIGHT_HEX,
  DEFAULT_BRAND_DARK_HEX,
  DEFAULT_BRAND_LIGHT_HEX,
  normalizeHexColor,
} from '$lib/constants/theme-colors';
import {
  DEFAULT_ADMIN_FONT_FAMILY,
  DEFAULT_ADMIN_FONT_IMPORT_URL,
  DEFAULT_PUBLIC_FONT_FAMILY,
  DEFAULT_PUBLIC_FONT_IMPORT_URL,
  normalizeFontFamilyDefinition,
  normalizeFontImportUrl,
} from '$lib/constants/typography-settings';

type SiteSettings = {
  public_font_import_url?: string | null;
  admin_font_import_url?: string | null;
  public_font_family?: string | null;
  admin_font_family?: string | null;
  brand_light_hex?: string | null;
  brand_dark_hex?: string | null;
  brand_contrast_light_hex?: string | null;
  brand_contrast_dark_hex?: string | null;
} | null;

export function createBrandStyles(getSiteSettings: () => SiteSettings) {
  const publicFontImportUrl = $derived(
    normalizeFontImportUrl(
      getSiteSettings()?.public_font_import_url,
      DEFAULT_PUBLIC_FONT_IMPORT_URL,
    ),
  );

  const adminFontImportUrl = $derived(
    normalizeFontImportUrl(
      getSiteSettings()?.admin_font_import_url,
      DEFAULT_ADMIN_FONT_IMPORT_URL,
    ),
  );

  const publicFontFamily = $derived(
    normalizeFontFamilyDefinition(
      getSiteSettings()?.public_font_family,
      DEFAULT_PUBLIC_FONT_FAMILY,
    ),
  );

  const adminFontFamily = $derived(
    normalizeFontFamilyDefinition(
      getSiteSettings()?.admin_font_family,
      DEFAULT_ADMIN_FONT_FAMILY,
    ),
  );

  const brandLightHex = $derived(
    normalizeHexColor(
      getSiteSettings()?.brand_light_hex,
      DEFAULT_BRAND_LIGHT_HEX,
    ),
  );

  const brandDarkHex = $derived(
    normalizeHexColor(
      getSiteSettings()?.brand_dark_hex,
      DEFAULT_BRAND_DARK_HEX,
    ),
  );

  const brandContrastLightHex = $derived(
    normalizeHexColor(
      getSiteSettings()?.brand_contrast_light_hex,
      DEFAULT_BRAND_CONTRAST_LIGHT_HEX,
    ),
  );

  const brandContrastDarkHex = $derived(
    normalizeHexColor(
      getSiteSettings()?.brand_contrast_dark_hex,
      DEFAULT_BRAND_CONTRAST_DARK_HEX,
    ),
  );

  const fontImportUrls = $derived.by(() => {
    const urls: string[] = [publicFontImportUrl];
    if (adminFontImportUrl !== publicFontImportUrl) {
      urls.push(adminFontImportUrl);
    }
    return urls;
  });

  $effect(() => {
    document.documentElement.style.setProperty(
      '--font-sans-public',
      publicFontFamily,
    );
    document.documentElement.style.setProperty(
      '--font-sans-admin',
      adminFontFamily,
    );
    document.documentElement.style.setProperty(
      '--color-brand-light',
      brandLightHex,
    );
    document.documentElement.style.setProperty(
      '--color-brand-dark',
      brandDarkHex,
    );
    document.documentElement.style.setProperty(
      '--color-brand-contrast-light',
      brandContrastLightHex,
    );
    document.documentElement.style.setProperty(
      '--color-brand-contrast-dark',
      brandContrastDarkHex,
    );
  });

  return {
    get publicFontFamily() {
      return publicFontFamily;
    },
    get adminFontFamily() {
      return adminFontFamily;
    },
    get brandLightHex() {
      return brandLightHex;
    },
    get brandDarkHex() {
      return brandDarkHex;
    },
    get brandContrastLightHex() {
      return brandContrastLightHex;
    },
    get brandContrastDarkHex() {
      return brandContrastDarkHex;
    },
    get fontImportUrls() {
      return fontImportUrls;
    },
  };
}
