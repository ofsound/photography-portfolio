import { describe, expect, it } from 'vitest';

import {
  sanitizeCmsCss,
  sanitizeCmsCssRaw,
  sanitizeCmsHtml,
} from '$lib/server/cms-sanitize';

describe('sanitizeCmsHtml', () => {
  it('strips dangerous markup and invalid URLs', () => {
    const sanitized = sanitizeCmsHtml(`
      <script>alert(1)</script>
      <p class="body">Safe copy</p>
      <a href="javascript:alert(1)" target="_blank">Bad link</a>
      <img src="javascript:alert(1)" alt="Bad image" />
    `);

    expect(sanitized).toContain('<p class="body">Safe copy</p>');
    expect(sanitized).not.toContain('<script');
    expect(sanitized).not.toContain('javascript:');
    expect(sanitized).not.toContain('<img');
  });

  it('preserves safe anchor and image attributes', () => {
    const sanitized = sanitizeCmsHtml(`
      <a
        href="https://example.com/work"
        target="_blank"
        title="Portfolio"
        class="link"
        rel="ugc"
      >View</a>
      <img
        src="/images/hero.jpg"
        alt="Hero"
        title="Cover"
        width="320"
        height="240"
        loading="lazy"
        decoding="async"
        class="photo"
      />
    `);

    expect(sanitized).toContain('href="https://example.com/work"');
    expect(sanitized).toContain('target="_blank"');
    expect(sanitized).toContain('rel="noopener noreferrer nofollow"');
    expect(sanitized).toContain('class="link"');
    expect(sanitized).toContain('src="/images/hero.jpg"');
    expect(sanitized).toContain('alt="Hero"');
    expect(sanitized).toContain('width="320"');
    expect(sanitized).toContain('height="240"');
    expect(sanitized).toContain('loading="lazy"');
    expect(sanitized).toContain('decoding="async"');
  });
});

describe('sanitizeCmsCssRaw', () => {
  it('drops unsafe declarations and descopes existing selectors', () => {
    const sanitized = sanitizeCmsCssRaw(`
      [data-cms-scope="old"] .card {
        color: red;
        background-image: url("/safe.jpg");
        behavior: url(/bad.htc);
      }

      .hero {
        background-image: url("javascript:alert(1)");
      }
    `);

    expect(sanitized).toContain('.card {');
    expect(sanitized).toContain('color: red;');
    expect(sanitized).toContain('background-image: url("/safe.jpg")');
    expect(sanitized).not.toContain('[data-cms-scope=');
    expect(sanitized).not.toContain('behavior:');
    expect(sanitized).not.toContain('javascript:');
  });
});

describe('sanitizeCmsCss', () => {
  it('scopes selectors and strips unsafe at-rules', () => {
    const sanitized = sanitizeCmsCss(
      `
      @import url("https://evil.example/x.css");

      body {
        color: red;
      }

      .card {
        background-image: url("/safe.jpg");
        -moz-binding: url("/bad.xml");
      }
    `,
      'Summer Trip 2026',
    );

    expect(sanitized).toContain('[data-cms-scope="summer-trip-2026"] .card{');
    expect(sanitized).toContain('background-image: url("/safe.jpg")');
    expect(sanitized).not.toContain('@import');
    expect(sanitized).not.toContain('-moz-binding');
  });
});
