/** Reactive density for gallery. */
let galleryDensity = $state<number>(6);

export const galleryDensityStore = {
  get value() {
    return galleryDensity;
  },
  set(newValue: number) {
    galleryDensity = newValue;
  },
};

/** Reactive layout mode for gallery. */
let galleryLayoutMode = $state<
  'uniform' | 'masonry' | 'coverage' | 'rows' | 'columns'
>('uniform');

export const layoutModeStore = {
  get value() {
    return galleryLayoutMode;
  },
  set(newValue: 'uniform' | 'masonry' | 'coverage' | 'rows' | 'columns') {
    galleryLayoutMode = newValue;
  },
};
