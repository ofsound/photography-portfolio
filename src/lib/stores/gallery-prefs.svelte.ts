const KEY = 'gallery_prefs';

/** Reactive density for gallery; synced with localStorage. Header and GalleryScene both use this. */
let galleryDensity = $state<number>(6);

export const galleryDensityStore = {
  get value() {
    return galleryDensity;
  },
  set(newValue: number) {
    galleryDensity = newValue;
  },
};

/** Reactive layout mode for gallery; synced with localStorage when user toggles. */
let galleryLayoutMode = $state<'uniform' | 'masonry'>('uniform');

export const layoutModeStore = {
  get value() {
    return galleryLayoutMode;
  },
  set(newValue: 'uniform' | 'masonry') {
    galleryLayoutMode = newValue;
  },
};

type GalleryPrefs = {
  density: number;
  gap: number;
  layoutMode: 'uniform' | 'masonry';
  widthMode: 'full' | 'constrained';
  pageSize: number;
};

/** Return type for getGalleryPrefs; layoutMode is optional when not explicitly saved. */
type GalleryPrefsResult = Omit<GalleryPrefs, 'layoutMode'> & {
  layoutMode?: 'uniform' | 'masonry';
};

const DEFAULT_PREFS: GalleryPrefs = {
  density: 6,
  gap: 8,
  layoutMode: 'uniform',
  widthMode: 'full',
  pageSize: 60,
};

const clampDensity = (n: number, max: number) => Math.max(1, Math.min(max, n));
const clampGap = (n: number) => Math.max(0, Math.min(20, n));
const clampPageSize = (n: number) => Math.max(1, Math.min(120, n));

function isValidLayoutMode(v: unknown): v is GalleryPrefs['layoutMode'] {
  return v === 'uniform' || v === 'masonry';
}

function isValidWidthMode(v: unknown): v is GalleryPrefs['widthMode'] {
  return v === 'full' || v === 'constrained';
}

export function getGalleryPrefs(
  maxDensity: number = 20,
): GalleryPrefsResult | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const density =
      typeof parsed.density === 'number' && Number.isFinite(parsed.density)
        ? clampDensity(parsed.density, maxDensity)
        : undefined;
    const gap =
      typeof parsed.gap === 'number' && Number.isFinite(parsed.gap)
        ? clampGap(parsed.gap)
        : undefined;
    const layoutMode = isValidLayoutMode(parsed.layoutMode)
      ? parsed.layoutMode
      : undefined;
    const widthMode = isValidWidthMode(parsed.widthMode)
      ? parsed.widthMode
      : undefined;
    const pageSize =
      typeof parsed.pageSize === 'number' && Number.isFinite(parsed.pageSize)
        ? clampPageSize(parsed.pageSize)
        : undefined;

    if (
      density === undefined &&
      gap === undefined &&
      layoutMode === undefined &&
      widthMode === undefined &&
      pageSize === undefined
    ) {
      return null;
    }

    return {
      density: density ?? DEFAULT_PREFS.density,
      gap: gap ?? DEFAULT_PREFS.gap,
      layoutMode, // undefined when not explicitly saved; use server default
      widthMode: widthMode ?? DEFAULT_PREFS.widthMode,
      pageSize: pageSize ?? DEFAULT_PREFS.pageSize,
    };
  } catch {
    return null;
  }
}

export function setGalleryPrefs(
  partial: Partial<GalleryPrefs>,
  maxDensity: number = 20,
): void {
  if (typeof window === 'undefined') return;
  const current = getGalleryPrefs(maxDensity) ?? DEFAULT_PREFS;
  const next: GalleryPrefs = {
    density:
      partial.density !== undefined
        ? clampDensity(partial.density, maxDensity)
        : current.density,
    gap: partial.gap !== undefined ? clampGap(partial.gap) : current.gap,
    layoutMode:
      partial.layoutMode !== undefined && isValidLayoutMode(partial.layoutMode)
        ? partial.layoutMode
        : (current.layoutMode ?? DEFAULT_PREFS.layoutMode),
    widthMode:
      partial.widthMode !== undefined && isValidWidthMode(partial.widthMode)
        ? partial.widthMode
        : current.widthMode,
    pageSize:
      partial.pageSize !== undefined
        ? clampPageSize(partial.pageSize)
        : current.pageSize,
  };
  localStorage.setItem(KEY, JSON.stringify(next));
  if (partial.density !== undefined) {
    galleryDensityStore.set(next.density);
  }
  if (partial.layoutMode !== undefined) {
    layoutModeStore.set(next.layoutMode);
  }
}
