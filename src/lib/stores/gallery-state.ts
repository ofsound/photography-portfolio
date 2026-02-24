import { writable } from 'svelte/store';

export type GalleryState = {
  density: number;
  layoutMode: 'uniform' | 'masonry';
  maxWidth: 'full' | 'constrained';
  showArchived: boolean;
};

export const defaultGalleryState: GalleryState = {
  density: 6,
  layoutMode: 'uniform',
  maxWidth: 'full',
  showArchived: false
};

export const galleryState = writable<GalleryState>(defaultGalleryState);
