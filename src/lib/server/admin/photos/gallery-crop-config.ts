import { throwLoaderError } from '$lib/server/load-error';
import { normalizeGallerySettingsForRead } from '$lib/server/gallery-settings-contract';
import type { Database } from '$lib/types/database';
import type {
  GalleryCropConfig,
  GalleryCropConfigByGalleryId,
} from '$lib/types/gallery-crop';

const CROP_SETTINGS_SELECT =
  'gallery_id, gallery_layout_mode, uniform_thumb_ratio';
const DEFAULT_SETTINGS_SELECT = 'gallery_layout_mode, uniform_thumb_ratio';

type GalleryCropSettingsRow = Pick<
  Database['public']['Tables']['gallery_settings']['Row'],
  'gallery_id' | 'gallery_layout_mode' | 'uniform_thumb_ratio'
>;

type SiteCropSettingsRow = Pick<
  Database['public']['Tables']['site_settings']['Row'],
  'gallery_layout_mode' | 'uniform_thumb_ratio'
>;

const toGalleryCropConfig = (
  settings: Partial<SiteCropSettingsRow> | null | undefined,
): GalleryCropConfig => {
  const normalized = normalizeGallerySettingsForRead(
    settings,
    'admin:thumb-crop',
  );
  return {
    layoutMode: normalized.gallery_layout_mode,
    uniformThumbRatio: normalized.uniform_thumb_ratio,
  };
};

export const loadGalleryCropConfigByGalleryId = async ({
  locals,
  galleryIds,
  route,
}: {
  locals: App.Locals;
  galleryIds: string[];
  route: string;
}): Promise<GalleryCropConfigByGalleryId> => {
  const uniqueGalleryIds = [...new Set(galleryIds.filter(Boolean))];

  if (uniqueGalleryIds.length === 0) {
    return {};
  }

  const [defaultsQuery, overridesQuery] = await Promise.all([
    locals.supabase
      .from('site_settings')
      .select(DEFAULT_SETTINGS_SELECT)
      .eq('singleton_id', 1)
      .maybeSingle(),
    locals.supabase
      .from('gallery_settings')
      .select(CROP_SETTINGS_SELECT)
      .eq('scope', 'gallery')
      .in('gallery_id', uniqueGalleryIds),
  ]);

  if (defaultsQuery.error) {
    throwLoaderError(
      { route, operation: 'load default thumbnail crop settings' },
      defaultsQuery.error,
    );
  }

  if (overridesQuery.error) {
    throwLoaderError(
      { route, operation: 'load gallery thumbnail crop settings' },
      overridesQuery.error,
    );
  }

  const defaultConfig = toGalleryCropConfig(
    defaultsQuery.data as Partial<SiteCropSettingsRow> | null,
  );

  const configByGalleryId = Object.fromEntries(
    uniqueGalleryIds.map((galleryId) => [galleryId, defaultConfig]),
  ) as GalleryCropConfigByGalleryId;

  for (const row of (overridesQuery.data ?? []) as GalleryCropSettingsRow[]) {
    if (!row.gallery_id) continue;
    configByGalleryId[row.gallery_id] = toGalleryCropConfig(row);
  }

  return configByGalleryId;
};
