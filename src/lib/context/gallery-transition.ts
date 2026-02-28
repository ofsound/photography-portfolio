import { setContext, getContext } from 'svelte';

export type GalleryTransitionPhase =
  | 'idle'
  | 'fade-out-chrome'
  | 'scale-and-mask'
  | 'open'
  | 'closing-chrome'
  | 'closing-scale';

const GALLERY_TRANSITION_KEY = Symbol('gallery-transition');

export type GalleryTransitionContext = {
  phase: GalleryTransitionPhase;
  setPhase: (phase: GalleryTransitionPhase) => void;
};

/** Call from a Svelte component that has created phase with $state. Provides the context to descendants. */
export function setGalleryTransitionContext(phase: GalleryTransitionPhase, setPhase: (p: GalleryTransitionPhase) => void): GalleryTransitionContext {
  const context: GalleryTransitionContext = { phase, setPhase };
  setContext(GALLERY_TRANSITION_KEY, context);
  return context;
}

/** Call in a descendant (e.g. GalleryScene) to consume the gallery transition phase. */
export function getGalleryTransitionContext(): GalleryTransitionContext {
  const ctx = getContext<GalleryTransitionContext>(GALLERY_TRANSITION_KEY);
  if (!ctx) {
    throw new Error(
      'GalleryTransitionContext not found. Ensure setGalleryTransitionContext() is called in a parent layout.'
    );
  }
  return ctx;
}
