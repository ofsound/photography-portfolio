import {
  DEFAULT_THUMBNAIL_ENTRANCE_PRESET,
  normalizeThumbnailEntrancePreset,
  type ThumbnailEntrancePreset,
} from '$lib/constants/thumbnail-entrance';

export type ThumbnailEntranceTileMetric = {
  slug: string;
  top: number;
  left: number;
  centerX: number;
  centerY: number;
};

type ThumbnailEntranceMotion = {
  className: string;
  delayMs: number;
  durationMs: number;
  staggerMs: number;
};

type ThumbnailEntranceOrderContext = {
  viewportCenterX: number;
  viewportCenterY: number;
};

type ThumbnailEntranceMotionContext = {
  rank: number;
};

type ThumbnailEntrancePresetRuntime = {
  id: ThumbnailEntrancePreset;
  buildOrder: (
    tiles: ThumbnailEntranceTileMetric[],
    context: ThumbnailEntranceOrderContext,
  ) => string[];
  buildMotion: (
    context: ThumbnailEntranceMotionContext,
  ) => ThumbnailEntranceMotion;
  durationMs: number;
  staggerMs: number;
};

const byTopLeft = (
  a: ThumbnailEntranceTileMetric,
  b: ThumbnailEntranceTileMetric,
) => {
  if (a.top !== b.top) {
    return a.top - b.top;
  }
  if (a.left !== b.left) {
    return a.left - b.left;
  }
  return a.slug.localeCompare(b.slug);
};

const shuffle = <T>(items: T[]) => {
  const shuffled = [...items];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const nextIndex = Math.floor(Math.random() * (index + 1));
    const current = shuffled[index];
    shuffled[index] = shuffled[nextIndex];
    shuffled[nextIndex] = current;
  }
  return shuffled;
};

const RUNTIMES: Record<
  ThumbnailEntrancePreset,
  ThumbnailEntrancePresetRuntime
> = {
  cascade: {
    id: 'cascade',
    durationMs: 520,
    staggerMs: 42,
    buildOrder: (tiles) => [...tiles].sort(byTopLeft).map((tile) => tile.slug),
    buildMotion: ({ rank }) => ({
      className: 'thumb-entrance-fx--cascade',
      delayMs: rank * 42,
      durationMs: 520,
      staggerMs: 42,
    }),
  },
  lift: {
    id: 'lift',
    durationMs: 500,
    staggerMs: 36,
    buildOrder: (tiles, context) =>
      [...tiles]
        .sort((a, b) => {
          const aDx = a.centerX - context.viewportCenterX;
          const aDy = a.centerY - context.viewportCenterY;
          const bDx = b.centerX - context.viewportCenterX;
          const bDy = b.centerY - context.viewportCenterY;
          const aDistance = Math.hypot(aDx, aDy);
          const bDistance = Math.hypot(bDx, bDy);

          if (aDistance !== bDistance) {
            return aDistance - bDistance;
          }

          return byTopLeft(a, b);
        })
        .map((tile) => tile.slug),
    buildMotion: ({ rank }) => ({
      className: 'thumb-entrance-fx--lift',
      delayMs: rank * 36,
      durationMs: 500,
      staggerMs: 36,
    }),
  },
  pop: {
    id: 'pop',
    durationMs: 430,
    staggerMs: 30,
    buildOrder: (tiles) => shuffle(tiles).map((tile) => tile.slug),
    buildMotion: ({ rank }) => ({
      className: 'thumb-entrance-fx--pop',
      delayMs: rank * 30,
      durationMs: 430,
      staggerMs: 30,
    }),
  },
};

export const resolveThumbnailEntrancePresetRuntime = (
  value: unknown,
): ThumbnailEntrancePresetRuntime => {
  const normalized = normalizeThumbnailEntrancePreset(value);
  return RUNTIMES[normalized] ?? RUNTIMES[DEFAULT_THUMBNAIL_ENTRANCE_PRESET];
};

export const buildThumbnailEntranceOrder = (
  preset: unknown,
  tiles: ThumbnailEntranceTileMetric[],
): string[] => {
  const runtime = resolveThumbnailEntrancePresetRuntime(preset);

  return runtime.buildOrder(tiles, {
    viewportCenterX: typeof window !== 'undefined' ? window.innerWidth / 2 : 0,
    viewportCenterY: typeof window !== 'undefined' ? window.innerHeight / 2 : 0,
  });
};
