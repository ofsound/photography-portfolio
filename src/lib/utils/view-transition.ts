export type ViewTransitionKind = 'default' | 'gallery-to-detail' | 'detail-to-gallery' | 'detail-to-detail';
export type ViewTransitionDirection = 'next' | 'prev';

type ViewTransitionHint = {
  kind?: ViewTransitionKind;
  direction?: ViewTransitionDirection;
};

const hintStorageKey = 'portfolio:view-transition-hint';
const galleryStateStorageKey = 'portfolio:gallery-return-state';
const safeNamePattern = /[^a-zA-Z0-9_-]/g;
const maxGalleryReturnStateAgeMs = 1000 * 60 * 30;

type GalleryReturnState = {
  url: string;
  scrollY: number;
  loadedPage: number;
  savedAt: number;
};

export const transitionNameForImage = (imageId: string | null | undefined) => {
  if (!imageId) return null;
  const safeId = imageId.replace(safeNamePattern, '-');
  return `photo-${safeId}`;
};

export const storeViewTransitionHint = (hint: ViewTransitionHint) => {
  if (typeof sessionStorage === 'undefined') return;

  try {
    sessionStorage.setItem(hintStorageKey, JSON.stringify(hint));
  } catch {
    // Ignore storage failures (private mode, quota, etc.)
  }
};

export const readAndClearViewTransitionHint = (): ViewTransitionHint | null => {
  if (typeof sessionStorage === 'undefined') return null;

  try {
    const raw = sessionStorage.getItem(hintStorageKey);
    if (!raw) return null;
    sessionStorage.removeItem(hintStorageKey);
    const parsed = JSON.parse(raw) as ViewTransitionHint;
    return parsed;
  } catch {
    return null;
  }
};

export const storeGalleryReturnState = (state: Omit<GalleryReturnState, 'savedAt'>) => {
  if (typeof sessionStorage === 'undefined') return;

  const payload: GalleryReturnState = {
    ...state,
    savedAt: Date.now()
  };

  try {
    sessionStorage.setItem(galleryStateStorageKey, JSON.stringify(payload));
  } catch {
    // Ignore storage failures.
  }
};

export const readGalleryReturnState = (): GalleryReturnState | null => {
  if (typeof sessionStorage === 'undefined') return null;

  try {
    const raw = sessionStorage.getItem(galleryStateStorageKey);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as GalleryReturnState;
    if (Date.now() - parsed.savedAt > maxGalleryReturnStateAgeMs) {
      sessionStorage.removeItem(galleryStateStorageKey);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
};

export const clearGalleryReturnState = () => {
  if (typeof sessionStorage === 'undefined') return;

  try {
    sessionStorage.removeItem(galleryStateStorageKey);
  } catch {
    // Ignore storage failures.
  }
};
