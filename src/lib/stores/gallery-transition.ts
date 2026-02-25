import { writable } from 'svelte/store';

export type GalleryTransitionPhase =
  | 'idle'
  | 'fade-out-chrome'
  | 'scale-and-mask'
  | 'open'
  | 'closing-chrome'
  | 'closing-scale';

export const galleryTransitionPhase = writable<GalleryTransitionPhase>('idle');
