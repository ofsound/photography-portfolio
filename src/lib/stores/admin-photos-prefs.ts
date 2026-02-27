const KEY = 'admin_photos_prefs';

export type AdminPhotosPrefs = {
  density: number;
  gap: number;
  layoutMode: 'uniform' | 'masonry';
  widthMode: 'full' | 'constrained';
};

const DEFAULT_PREFS: AdminPhotosPrefs = {
  density: 6,
  gap: 8,
  layoutMode: 'uniform',
  widthMode: 'full'
};

const clampDensity = (n: number, max: number) => Math.max(1, Math.min(max, n));
const clampGap = (n: number) => Math.max(0, Math.min(20, n));

function isValidLayoutMode(v: unknown): v is AdminPhotosPrefs['layoutMode'] {
  return v === 'uniform' || v === 'masonry';
}

function isValidWidthMode(v: unknown): v is AdminPhotosPrefs['widthMode'] {
  return v === 'full' || v === 'constrained';
}

export function getAdminPhotosPrefs(maxDensity: number = 20): AdminPhotosPrefs | null {
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
    const layoutMode = isValidLayoutMode(parsed.layoutMode) ? parsed.layoutMode : undefined;
    const widthMode = isValidWidthMode(parsed.widthMode) ? parsed.widthMode : undefined;

    if (
      density === undefined &&
      gap === undefined &&
      layoutMode === undefined &&
      widthMode === undefined
    ) {
      return null;
    }

    return {
      density: density ?? DEFAULT_PREFS.density,
      gap: gap ?? DEFAULT_PREFS.gap,
      layoutMode: layoutMode ?? DEFAULT_PREFS.layoutMode,
      widthMode: widthMode ?? DEFAULT_PREFS.widthMode
    };
  } catch {
    return null;
  }
}

export function setAdminPhotosPrefs(
  partial: Partial<AdminPhotosPrefs>,
  maxDensity: number = 20
): void {
  if (typeof window === 'undefined') return;
  const current = getAdminPhotosPrefs(maxDensity) ?? DEFAULT_PREFS;
  const next: AdminPhotosPrefs = {
    density:
      partial.density !== undefined
        ? clampDensity(partial.density, maxDensity)
        : current.density,
    gap: partial.gap !== undefined ? clampGap(partial.gap) : current.gap,
    layoutMode:
      partial.layoutMode !== undefined && isValidLayoutMode(partial.layoutMode)
        ? partial.layoutMode
        : current.layoutMode,
    widthMode:
      partial.widthMode !== undefined && isValidWidthMode(partial.widthMode)
        ? partial.widthMode
        : current.widthMode
  };
  localStorage.setItem(KEY, JSON.stringify(next));
}
