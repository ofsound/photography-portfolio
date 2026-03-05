import type { GallerySceneState } from './createGallerySceneState.svelte';

type TransitionQueue = {
  enqueue: (work: () => Promise<void>) => Promise<void>;
};

type GalleryNavigationOptions = {
  state: GallerySceneState;
  transitionQueue: TransitionQueue;
  canCycleGallery: () => boolean;
  localNeighborsFor: (slug: string) => {
    prevGalleryHref: string | null;
    nextGalleryHref: string | null;
  };
  parseSlugFromPhotoHref: (href: string | null) => string | null;
  slideToNeighbor: (
    slug: string,
    direction: 'prev' | 'next',
  ) => Promise<boolean>;
  gotoPhotoRoute: (slug: string, imageId?: string | null) => Promise<void>;
};

export const createGalleryNavigation = ({
  state,
  transitionQueue,
  canCycleGallery,
  localNeighborsFor,
  parseSlugFromPhotoHref,
  slideToNeighbor,
  gotoPhotoRoute,
}: GalleryNavigationOptions) => {
  const pendingDirectionQueue: Array<'prev' | 'next'> = [];
  let directionDrainScheduled = false;

  const clearDirectionQueue = () => {
    pendingDirectionQueue.length = 0;
    directionDrainScheduled = false;
  };

  const drainDirectionQueue = () => {
    if (state.isClosing || !state.activeSlug) {
      clearDirectionQueue();
      return;
    }

    if (pendingDirectionQueue.length === 0) {
      directionDrainScheduled = false;
      if (!state.isClosing) {
        state.skipNextRouteAnimation = true;
        state.expectedRouteKeyFromGoto = `${state.activeSlug}:`;
        void gotoPhotoRoute(state.activeSlug);
      }
      return;
    }

    directionDrainScheduled = true;
    const direction = pendingDirectionQueue.shift()!;
    const neighbors =
      direction === 'next'
        ? localNeighborsFor(state.activeSlug).nextGalleryHref
        : localNeighborsFor(state.activeSlug).prevGalleryHref;
    const targetSlug = parseSlugFromPhotoHref(neighbors);

    if (!targetSlug) {
      drainDirectionQueue();
      return;
    }

    void transitionQueue
      .enqueue(async () => {
        if (state.isClosing) return;
        const localNeighbors = localNeighborsFor(targetSlug);
        state.prevGalleryHref = localNeighbors.prevGalleryHref;
        state.nextGalleryHref = localNeighbors.nextGalleryHref;
        await slideToNeighbor(targetSlug, direction);
      })
      .then(() => {
        drainDirectionQueue();
      });
  };

  const onNeighborNavigate = (direction: 'prev' | 'next') => {
    if (!canCycleGallery() || state.isClosing) return;

    pendingDirectionQueue.push(direction);
    if (!directionDrainScheduled) {
      drainDirectionQueue();
    }
  };

  return {
    clearDirectionQueue,
    onNeighborNavigate,
    drainDirectionQueue,
  };
};
