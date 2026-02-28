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

/** Call in the root layout to provide gallery transition phase to descendants. Returns the context for use in the same component. */
export function setGalleryTransitionContext(): GalleryTransitionContext {
  let phase = $state<GalleryTransitionPhase>('idle');
  const context: GalleryTransitionContext = {
    phase,
    setPhase: (p: GalleryTransitionPhase) => {
      phase = p;
    }
  };
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
