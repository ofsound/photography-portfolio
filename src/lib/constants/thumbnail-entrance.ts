export const THUMBNAIL_ENTRANCE_PRESET_OPTIONS = [
  {
    id: 'cascade',
    label: 'Cascade',
    description: 'Top-left to bottom-right reveal.',
  },
  {
    id: 'lift',
    label: 'Lift',
    description: 'Center-out reveal with stronger upward motion.',
  },
  {
    id: 'pop',
    label: 'Pop',
    description: 'Random reveal with scale-in from 60%.',
  },
] as const;

export type ThumbnailEntrancePreset =
  (typeof THUMBNAIL_ENTRANCE_PRESET_OPTIONS)[number]['id'];

export const DEFAULT_THUMBNAIL_ENTRANCE_PRESET: ThumbnailEntrancePreset =
  'cascade';

const THUMBNAIL_ENTRANCE_PRESET_SET = new Set<ThumbnailEntrancePreset>(
  THUMBNAIL_ENTRANCE_PRESET_OPTIONS.map((option) => option.id),
);

const isThumbnailEntrancePreset = (
  value: unknown,
): value is ThumbnailEntrancePreset =>
  typeof value === 'string' &&
  THUMBNAIL_ENTRANCE_PRESET_SET.has(value as ThumbnailEntrancePreset);

export const normalizeThumbnailEntrancePreset = (
  value: unknown,
): ThumbnailEntrancePreset =>
  isThumbnailEntrancePreset(value) ? value : DEFAULT_THUMBNAIL_ENTRANCE_PRESET;
