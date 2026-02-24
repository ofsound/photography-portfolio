import { asPositiveInt, loadGalleryPage, normalizePageSize } from '$lib/server/gallery';
import type { PageServerLoad } from './$types';

type GalleryLayoutMode = 'uniform' | 'masonry';
type GalleryWidthMode = 'full' | 'constrained';

const asLayoutMode = (value: string | null, fallback: GalleryLayoutMode): GalleryLayoutMode => {
  return value === 'uniform' || value === 'masonry' ? value : fallback;
};

const asWidthMode = (value: string | null, fallback: GalleryWidthMode): GalleryWidthMode => {
  return value === 'full' || value === 'constrained' ? value : fallback;
};

export const load: PageServerLoad = async ({ locals, url }) => {
  const { data: settings } = await locals.supabase
    .from('site_settings')
    .select('grid_desktop_default, grid_desktop_max, max_content_width_px, gallery_layout_mode, uniform_thumb_ratio')
    .eq('singleton_id', 1)
    .maybeSingle();

  const defaultDensity = settings?.grid_desktop_default ?? 6;
  const maxDensity = settings?.grid_desktop_max ?? 20;
  const page = asPositiveInt(url.searchParams.get('page'), 1);
  const pageSize = normalizePageSize(asPositiveInt(url.searchParams.get('pageSize'), 60));
  const density = Math.max(1, Math.min(maxDensity, asPositiveInt(url.searchParams.get('density'), defaultDensity)));
  const q = url.searchParams.get('q')?.trim() ?? '';
  const layoutMode = asLayoutMode(url.searchParams.get('layout'), settings?.gallery_layout_mode ?? 'uniform');
  const widthMode = asWidthMode(
    url.searchParams.get('width'),
    settings?.max_content_width_px ? 'constrained' : 'full'
  );

  const { photos, hasMore } = await loadGalleryPage(locals, { page, pageSize, q });
  const baseParams = new URLSearchParams(url.searchParams);
  baseParams.delete('page');

  return {
    photos,
    hasMore,
    page,
    pageSize,
    density,
    q,
    layoutMode,
    widthMode,
    maxContentWidthPx: settings?.max_content_width_px ?? null,
    uniformThumbRatio: Number(settings?.uniform_thumb_ratio ?? 1),
    maxDensity,
    baseQueryString: baseParams.toString()
  };
};
