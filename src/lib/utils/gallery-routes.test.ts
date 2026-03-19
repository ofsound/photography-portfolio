import { describe, expect, it } from 'vitest';

import {
  buildGalleryFeedPath,
  buildGalleryPath,
  buildGalleryPhotoPath,
  isGalleryDetailPath,
} from '$lib/utils/gallery-routes';

describe('gallery routes', () => {
  it('encodes gallery and photo path segments', () => {
    expect(buildGalleryPath('Summer 2026/Selects')).toBe(
      '/Summer%202026%2FSelects',
    );
    expect(buildGalleryFeedPath('Summer 2026/Selects')).toBe(
      '/Summer%202026%2FSelects/feed',
    );
    expect(buildGalleryPhotoPath('Summer 2026', 'Hero Shot', 'image/1')).toBe(
      '/Summer%202026/photo/Hero%20Shot/image%2F1',
    );
  });

  it('builds photo paths with or without an image id', () => {
    expect(buildGalleryPhotoPath('alps', 'sunrise')).toBe(
      '/alps/photo/sunrise',
    );
    expect(buildGalleryPhotoPath('alps', 'sunrise', null)).toBe(
      '/alps/photo/sunrise',
    );
  });

  it('recognizes gallery detail routes only', () => {
    expect(isGalleryDetailPath('/alps/photo/sunrise')).toBe(true);
    expect(isGalleryDetailPath('/alps/photo/sunrise/hero-1')).toBe(true);
    expect(isGalleryDetailPath('/alps/feed')).toBe(false);
    expect(isGalleryDetailPath('/admin/alps/photos')).toBe(false);
  });
});
