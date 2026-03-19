import { describe, expect, it } from 'vitest';

import {
  DEFAULT_PUBLIC_FONT_FAMILY,
  DEFAULT_PUBLIC_FONT_IMPORT_URL,
  isAllowedGoogleFontsImportUrl,
  isSafeFontFamilyDefinition,
  normalizeFontFamilyDefinition,
  normalizeFontImportUrl,
} from '$lib/constants/typography-settings';

describe('isAllowedGoogleFontsImportUrl', () => {
  it('accepts valid Google Fonts css2 URLs', () => {
    expect(
      isAllowedGoogleFontsImportUrl(
        'https://fonts.googleapis.com/css2?family=Gabarito:wght@400..900&display=swap',
      ),
    ).toBe(true);
  });

  it('rejects non-https, non-google-fonts, or malformed URLs', () => {
    expect(
      isAllowedGoogleFontsImportUrl(
        'http://fonts.googleapis.com/css2?family=Gabarito&display=swap',
      ),
    ).toBe(false);
    expect(
      isAllowedGoogleFontsImportUrl(
        'https://example.com/css2?family=Gabarito&display=swap',
      ),
    ).toBe(false);
    expect(isAllowedGoogleFontsImportUrl('not a url')).toBe(false);
  });
});

describe('isSafeFontFamilyDefinition', () => {
  it('accepts plain font-family definitions', () => {
    expect(isSafeFontFamilyDefinition("'Gabarito', sans-serif")).toBe(true);
    expect(isSafeFontFamilyDefinition('Cormorant Garamond, serif')).toBe(true);
  });

  it('rejects dangerous or invalid font-family definitions', () => {
    expect(isSafeFontFamilyDefinition('')).toBe(false);
    expect(isSafeFontFamilyDefinition('  ')).toBe(false);
    expect(isSafeFontFamilyDefinition('A'.repeat(201))).toBe(false);
    expect(isSafeFontFamilyDefinition('body{color:red}')).toBe(false);
    expect(isSafeFontFamilyDefinition('Font<script>')).toBe(false);
  });
});

describe('font normalization', () => {
  it('falls back when the import URL is invalid', () => {
    expect(
      normalizeFontImportUrl(
        'https://example.com/font.css',
        DEFAULT_PUBLIC_FONT_IMPORT_URL,
      ),
    ).toBe(DEFAULT_PUBLIC_FONT_IMPORT_URL);
  });

  it('falls back when the font-family definition is invalid', () => {
    expect(
      normalizeFontFamilyDefinition(
        'body{color:red}',
        DEFAULT_PUBLIC_FONT_FAMILY,
      ),
    ).toBe(DEFAULT_PUBLIC_FONT_FAMILY);
  });

  it('keeps valid values after trimming', () => {
    expect(
      normalizeFontImportUrl(
        '  https://fonts.googleapis.com/css2?family=Gabarito&display=swap  ',
        DEFAULT_PUBLIC_FONT_IMPORT_URL,
      ),
    ).toBe('https://fonts.googleapis.com/css2?family=Gabarito&display=swap');
    expect(
      normalizeFontFamilyDefinition(
        "  'Cormorant Garamond', serif  ",
        DEFAULT_PUBLIC_FONT_FAMILY,
      ),
    ).toBe("'Cormorant Garamond', serif");
  });
});
