import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('$lib/utils/storage-url', () => ({
  GALLERY_DETAIL_SHARED_WIDTH: 2400,
  photoPublicUrl: vi.fn((path: string, width?: number) => {
    return `https://img.example/${path}?w=${width ?? 'none'}`;
  }),
}));

import { load } from './+page.server';

type QueryResult<T> = {
  data: T;
  error: null;
};

type SearchLoadResult = Exclude<Awaited<ReturnType<typeof load>>, void>;

const createPhotosChain = (result: QueryResult<unknown>) => {
  const chain = {
    eq: vi.fn(),
    is: vi.fn(),
    order: vi.fn(),
    limit: vi.fn(),
  };

  chain.eq.mockReturnValue(chain);
  chain.is.mockReturnValue(chain);
  chain.order.mockReturnValue(chain);
  chain.limit.mockResolvedValue(result);

  return chain;
};

const createRelationChain = (result: QueryResult<unknown>) => {
  const chain = {
    in: vi.fn(),
  };

  chain.in.mockResolvedValue(result);

  return chain;
};

const createSupabaseMock = ({
  photos,
  categories,
  tags,
}: {
  photos: QueryResult<unknown>;
  categories: QueryResult<unknown>;
  tags: QueryResult<unknown>;
}) => {
  const photosChain = createPhotosChain(photos);
  const categoryChain = createRelationChain(categories);
  const tagChain = createRelationChain(tags);

  return {
    from: vi.fn((table: string) => {
      if (table === 'photos') {
        return {
          select: vi.fn(() => photosChain),
        };
      }

      if (table === 'photo_categories') {
        return {
          select: vi.fn(() => categoryChain),
        };
      }

      if (table === 'photo_tags') {
        return {
          select: vi.fn(() => tagChain),
        };
      }

      throw new Error(`Unexpected table: ${table}`);
    }),
    photosChain,
    categoryChain,
    tagChain,
  };
};

describe('search page load', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shapes photos, dedupes active taxonomy, and normalizes invalid requested filters', async () => {
    const supabase = createSupabaseMock({
      photos: {
        data: [
          {
            id: 'photo-1',
            slug: 'sunrise',
            title: 'Sunrise',
            description: 'Warm mist',
            capture_date: '2026-01-02',
            created_at: '2026-01-02T00:00:00Z',
            galleries: {
              slug: 'alps',
              name: 'Alps',
              visibility_status: 'public',
            },
            photo_images: [
              {
                id: 'img-extra',
                kind: 'additional',
                position: 2,
                delivery_storage_path: 'extra.jpg',
                alt_text: 'Extra',
              },
              {
                id: 'img-lead',
                kind: 'lead',
                position: 1,
                delivery_storage_path: 'lead.jpg',
                alt_text: null,
              },
            ],
          },
          {
            id: 'photo-2',
            slug: 'forest',
            title: 'Forest',
            description: null,
            capture_date: '2026-01-01',
            created_at: '2026-01-01T00:00:00Z',
            galleries: [
              { slug: 'coast', name: 'Coast', visibility_status: 'public' },
            ],
            photo_images: [
              {
                id: 'img-forest',
                kind: 'lead',
                position: 1,
                delivery_storage_path: 'forest.jpg',
                alt_text: 'Forest alt',
              },
            ],
          },
        ],
        error: null,
      },
      categories: {
        data: [
          {
            photo_id: 'photo-1',
            categories: {
              slug: 'landscape',
              name: 'Landscape',
              is_active: true,
            },
          },
          {
            photo_id: 'photo-1',
            categories: [
              { slug: 'landscape', name: 'Landscape', is_active: true },
            ],
          },
          {
            photo_id: 'photo-1',
            categories: { slug: 'hidden', name: 'Hidden', is_active: false },
          },
          {
            photo_id: 'photo-2',
            categories: { slug: 'abstract', name: 'Abstract', is_active: true },
          },
        ],
        error: null,
      },
      tags: {
        data: [
          {
            photo_id: 'photo-1',
            tags: { slug: 'mist', name: 'Mist', is_active: true },
          },
          {
            photo_id: 'photo-1',
            tags: { slug: 'mist', name: 'Mist', is_active: true },
          },
          {
            photo_id: 'photo-2',
            tags: { slug: 'blue', name: 'Blue', is_active: true },
          },
          {
            photo_id: 'photo-2',
            tags: { slug: 'archived', name: 'Archived', is_active: false },
          },
        ],
        error: null,
      },
    });

    const result = (await load({
      locals: { supabase } as never,
      url: new URL(
        'https://example.com/search?q=%20mist%20&gallery=missing&category=nope&tag=bad',
      ),
    } as never)) as SearchLoadResult;

    expect(result.q).toBe('mist');
    expect(result.gallery).toBe('');
    expect(result.category).toBe('');
    expect(result.tag).toBe('');

    expect(result.galleries).toEqual([
      { slug: 'alps', name: 'Alps' },
      { slug: 'coast', name: 'Coast' },
    ]);
    expect(result.categories).toEqual([
      { slug: 'abstract', name: 'Abstract' },
      { slug: 'landscape', name: 'Landscape' },
    ]);
    expect(result.tags).toEqual([
      { slug: 'blue', name: 'Blue' },
      { slug: 'mist', name: 'Mist' },
    ]);

    expect(result.photos[0]).toMatchObject({
      id: 'photo-1',
      gallerySlug: 'alps',
      galleryName: 'Alps',
      thumb: 'https://img.example/lead.jpg?w=2400',
      thumbAlt: 'Sunrise',
      categories: [{ slug: 'landscape', name: 'Landscape' }],
      tags: [{ slug: 'mist', name: 'Mist' }],
    });
    expect(result.photos[0].searchText).toContain('sunrise');
    expect(result.photos[0].searchText).toContain('warm mist');
    expect(result.photos[0].searchText).toContain('landscape');
    expect(result.photos[0].searchText).toContain('mist');

    expect(supabase.categoryChain.in).toHaveBeenCalledWith('photo_id', [
      'photo-1',
      'photo-2',
    ]);
    expect(supabase.tagChain.in).toHaveBeenCalledWith('photo_id', [
      'photo-1',
      'photo-2',
    ]);
  });

  it('skips taxonomy lookups when no public photos are returned', async () => {
    const supabase = createSupabaseMock({
      photos: {
        data: [],
        error: null,
      },
      categories: {
        data: [],
        error: null,
      },
      tags: {
        data: [],
        error: null,
      },
    });

    const result = (await load({
      locals: { supabase } as never,
      url: new URL('https://example.com/search?gallery=alps'),
    } as never)) as SearchLoadResult;

    expect(result.photos).toEqual([]);
    expect(result.galleries).toEqual([]);
    expect(result.categories).toEqual([]);
    expect(result.tags).toEqual([]);
    expect(result.gallery).toBe('');
    expect(supabase.categoryChain.in).not.toHaveBeenCalled();
    expect(supabase.tagChain.in).not.toHaveBeenCalled();
  });
});
