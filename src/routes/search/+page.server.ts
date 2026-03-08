import { throwLoaderError } from '$lib/server/load-error';
import {
  GALLERY_DETAIL_SHARED_WIDTH,
  photoPublicUrl,
} from '$lib/utils/storage-url';
import type { PageServerLoad } from './$types';

type GalleryRelation =
  | {
      slug: string;
      name: string;
      visibility_status?: 'public' | 'unlisted' | 'archived';
    }
  | Array<{
      slug: string;
      name: string;
      visibility_status?: 'public' | 'unlisted' | 'archived';
    }>
  | null;

type PhotoImageRelation = Array<{
  id: string;
  kind: 'lead' | 'additional';
  position: number;
  delivery_storage_path: string | null;
  alt_text: string | null;
}> | null;

type TaxonomyRelation =
  | {
      slug: string;
      name: string;
      is_active: boolean;
    }
  | Array<{
      slug: string;
      name: string;
      is_active: boolean;
    }>
  | null;

const readSingleRelation = <T>(value: T | T[] | null | undefined): T | null => {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
};

const normalizeSearchText = (parts: Array<string | null | undefined>) =>
  parts
    .map((part) => part?.trim().toLowerCase() ?? '')
    .filter(Boolean)
    .join(' ');

export const load: PageServerLoad = async ({ locals, url }) => {
  const requestedQuery = url.searchParams.get('q')?.trim() ?? '';
  const requestedGallery = url.searchParams.get('gallery')?.trim() ?? '';
  const requestedCategory = url.searchParams.get('category')?.trim() ?? '';
  const requestedTag = url.searchParams.get('tag')?.trim() ?? '';

  const photosQuery = await locals.supabase
    .from('photos')
    .select(
      'id, slug, title, description, capture_date, created_at, galleries!inner(slug, name, visibility_status), photo_images(id, kind, position, delivery_storage_path, alt_text)',
    )
    .eq('status', 'published')
    .is('deleted_at', null)
    .eq('galleries.visibility_status', 'public')
    .order('capture_date', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false })
    .order('id', { ascending: false })
    .limit(2000);

  if (photosQuery.error) {
    throwLoaderError(
      { route: '/search', operation: 'load public explorer photos' },
      photosQuery.error,
    );
  }

  const basePhotos = (photosQuery.data ?? []).map((row) => {
    const gallery = readSingleRelation(row.galleries as GalleryRelation);
    const leadImage = [...((row.photo_images as PhotoImageRelation) ?? [])]
      .filter((image) => image.kind === 'lead')
      .sort((a, b) => a.position - b.position)[0];

    return {
      id: row.id,
      slug: row.slug,
      title: row.title,
      description: row.description,
      captureDate: row.capture_date,
      gallerySlug: gallery?.slug ?? '',
      galleryName: gallery?.name ?? 'Unknown gallery',
      thumb: leadImage?.delivery_storage_path
        ? photoPublicUrl(
            leadImage.delivery_storage_path,
            GALLERY_DETAIL_SHARED_WIDTH,
          )
        : null,
      thumbAlt: leadImage?.alt_text ?? row.title,
    };
  });

  const photoIds = basePhotos.map((photo) => photo.id);

  let categoryLinks: Array<{
    photo_id: string;
    categories: TaxonomyRelation;
  }> | null = null;
  let tagLinks: Array<{
    photo_id: string;
    tags: TaxonomyRelation;
  }> | null = null;

  if (photoIds.length > 0) {
    const [categoryQuery, tagQuery] = await Promise.all([
      locals.supabase
        .from('photo_categories')
        .select('photo_id, categories!inner(slug, name, is_active)')
        .in('photo_id', photoIds),
      locals.supabase
        .from('photo_tags')
        .select('photo_id, tags!inner(slug, name, is_active)')
        .in('photo_id', photoIds),
    ]);

    if (categoryQuery.error) {
      throwLoaderError(
        { route: '/search', operation: 'load public explorer categories' },
        categoryQuery.error,
      );
    }
    if (tagQuery.error) {
      throwLoaderError(
        { route: '/search', operation: 'load public explorer tags' },
        tagQuery.error,
      );
    }

    categoryLinks = categoryQuery.data ?? [];
    tagLinks = tagQuery.data ?? [];
  }

  const categoriesByPhotoId = new Map<
    string,
    Array<{
      slug: string;
      name: string;
    }>
  >();
  const tagsByPhotoId = new Map<
    string,
    Array<{
      slug: string;
      name: string;
    }>
  >();

  for (const link of categoryLinks ?? []) {
    const category = readSingleRelation(link.categories);
    if (!category?.slug || !category.is_active) continue;

    const current = categoriesByPhotoId.get(link.photo_id) ?? [];
    if (!current.some((entry) => entry.slug === category.slug)) {
      current.push({ slug: category.slug, name: category.name });
      current.sort((a, b) => a.name.localeCompare(b.name));
      categoriesByPhotoId.set(link.photo_id, current);
    }
  }

  for (const link of tagLinks ?? []) {
    const tag = readSingleRelation(link.tags);
    if (!tag?.slug || !tag.is_active) continue;

    const current = tagsByPhotoId.get(link.photo_id) ?? [];
    if (!current.some((entry) => entry.slug === tag.slug)) {
      current.push({ slug: tag.slug, name: tag.name });
      current.sort((a, b) => a.name.localeCompare(b.name));
      tagsByPhotoId.set(link.photo_id, current);
    }
  }

  const galleriesMap = new Map<string, { slug: string; name: string }>();
  const categoriesMap = new Map<string, { slug: string; name: string }>();
  const tagsMap = new Map<string, { slug: string; name: string }>();

  const photos = basePhotos.map((photo) => {
    const categories = categoriesByPhotoId.get(photo.id) ?? [];
    const tags = tagsByPhotoId.get(photo.id) ?? [];

    if (photo.gallerySlug) {
      galleriesMap.set(photo.gallerySlug, {
        slug: photo.gallerySlug,
        name: photo.galleryName,
      });
    }

    for (const category of categories) {
      categoriesMap.set(category.slug, category);
    }

    for (const tag of tags) {
      tagsMap.set(tag.slug, tag);
    }

    return {
      ...photo,
      categories,
      tags,
      searchText: normalizeSearchText([
        photo.title,
        photo.description,
        photo.slug,
        photo.galleryName,
        ...categories.map((category) => category.name),
        ...tags.map((tag) => tag.name),
      ]),
    };
  });

  const galleries = [...galleriesMap.values()].sort((a, b) =>
    a.name.localeCompare(b.name),
  );
  const categories = [...categoriesMap.values()].sort((a, b) =>
    a.name.localeCompare(b.name),
  );
  const tags = [...tagsMap.values()].sort((a, b) =>
    a.name.localeCompare(b.name),
  );

  const gallerySlugs = new Set(galleries.map((gallery) => gallery.slug));
  const categorySlugs = new Set(categories.map((category) => category.slug));
  const tagSlugs = new Set(tags.map((tag) => tag.slug));

  return {
    q: requestedQuery,
    gallery: gallerySlugs.has(requestedGallery) ? requestedGallery : '',
    category: categorySlugs.has(requestedCategory) ? requestedCategory : '',
    tag: tagSlugs.has(requestedTag) ? requestedTag : '',
    photos,
    galleries,
    categories,
    tags,
  };
};
