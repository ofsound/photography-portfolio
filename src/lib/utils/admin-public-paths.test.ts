import { describe, expect, it } from 'vitest';

import {
  computeAdminPublicPath,
  resolveAdminEditorPath,
} from '$lib/utils/admin-public-paths';

describe('resolveAdminEditorPath', () => {
  const gallerySlugs = new Set(['alps', 'summer-trip']);

  it('returns null for admin, auth, and search paths', () => {
    expect(resolveAdminEditorPath('/admin/galleries', gallerySlugs)).toBe(null);
    expect(resolveAdminEditorPath('/auth', gallerySlugs)).toBe(null);
    expect(resolveAdminEditorPath('/search', gallerySlugs)).toBe(null);
  });

  it('maps public routes back to the correct admin editor path', () => {
    expect(resolveAdminEditorPath('/', gallerySlugs)).toBe('/admin/homepage');
    expect(resolveAdminEditorPath('/alps', gallerySlugs)).toBe(
      '/admin/alps/details',
    );
    expect(resolveAdminEditorPath('/about me', gallerySlugs)).toBe(
      '/admin/pages/edit/about%20me',
    );
    expect(
      resolveAdminEditorPath('/summer-trip/photo/golden hour', gallerySlugs),
    ).toBe('/admin/summer-trip/photos/edit/golden%20hour');
    expect(resolveAdminEditorPath('/alps/feed', gallerySlugs)).toBe(
      '/admin/alps/details',
    );
  });
});

describe('computeAdminPublicPath', () => {
  it('maps supported admin routes to public routes', () => {
    expect(computeAdminPublicPath('/admin/homepage', null)).toBe('/');
    expect(
      computeAdminPublicPath('/admin/pages/edit/about', {
        page: { slug: 'about me' },
      } as never),
    ).toBe('/about%20me');
    expect(
      computeAdminPublicPath('/admin/alps/details', {
        gallery: { slug: 'alps' },
      } as never),
    ).toBe('/alps');
    expect(
      computeAdminPublicPath('/admin/alps/photos/edit/sunrise', {
        gallery: { slug: 'alps' },
        photo: { slug: 'golden hour' },
      } as never),
    ).toBe('/alps/photo/golden%20hour');
  });

  it('returns null when required route data is missing or unsupported', () => {
    expect(computeAdminPublicPath('/search', null)).toBe(null);
    expect(computeAdminPublicPath('/admin/pages/edit/about', null)).toBe(null);
    expect(
      computeAdminPublicPath('/admin/alps/photos/edit/sunrise', {
        gallery: { slug: 'alps' },
      } as never),
    ).toBe(null);
  });
});
