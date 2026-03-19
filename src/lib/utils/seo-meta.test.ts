import { describe, expect, it } from 'vitest';

import { resolveSeoOgMeta } from '$lib/utils/seo-meta';

describe('resolveSeoOgMeta', () => {
  it('applies SEO and OG overrides with trimmed values', () => {
    expect(
      resolveSeoOgMeta({
        entityTitle: '  Gallery Title  ',
        entityDescription: '  Entity description  ',
        seoTitle: '  SEO Title  ',
        seoDescription: '  SEO Description  ',
        ogTitle: '  OG Title  ',
        ogDescription: '  OG Description  ',
        ogImagePath: '  /og.jpg  ',
        fallbackOgImagePath: '/fallback.jpg',
      }),
    ).toEqual({
      title: 'SEO Title',
      description: 'SEO Description',
      ogTitle: 'OG Title',
      ogDescription: 'OG Description',
      ogImage: '/og.jpg',
    });
  });

  it('falls back through entity values and default title when fields are blank', () => {
    expect(
      resolveSeoOgMeta({
        entityTitle: '  ',
        entityDescription: '  ',
        seoTitle: null,
        seoDescription: undefined,
        ogTitle: '',
        ogDescription: '',
        ogImagePath: ' ',
        fallbackOgImagePath: ' /fallback.jpg ',
      }),
    ).toEqual({
      title: 'Untitled',
      description: null,
      ogTitle: 'Untitled',
      ogDescription: null,
      ogImage: '/fallback.jpg',
    });
  });

  it('uses entity values when explicit SEO fields are absent', () => {
    expect(
      resolveSeoOgMeta({
        entityTitle: 'Coastline',
        entityDescription: 'Wind and mist',
        fallbackOgImagePath: '/cover.jpg',
      }),
    ).toEqual({
      title: 'Coastline',
      description: 'Wind and mist',
      ogTitle: 'Coastline',
      ogDescription: 'Wind and mist',
      ogImage: '/cover.jpg',
    });
  });
});
