type TransitionWork = () => Promise<void>;

type CreateGalleryTransitionQueueOptions = {
  onError?: (error: unknown) => void;
};

export const createGalleryTransitionQueue = (
  options: CreateGalleryTransitionQueueOptions = {},
) => {
  let queue = Promise.resolve();
  let inFlight = $state(0);
  let pendingRouteApply: TransitionWork | null = null;

  const flushPendingRouteApply = () => {
    if (!pendingRouteApply) return;
    const work = pendingRouteApply;
    pendingRouteApply = null;
    void enqueue(work);
  };

  const enqueue = (work: TransitionWork) => {
    queue = queue
      .then(async () => {
        inFlight += 1;
        try {
          await work();
        } finally {
          inFlight = Math.max(0, inFlight - 1);
          if (inFlight === 0) {
            flushPendingRouteApply();
          }
        }
      })
      .catch((error) => {
        inFlight = 0;
        options.onError?.(error);
        flushPendingRouteApply();
      });

    return queue;
  };

  const deferRouteApply = (work: TransitionWork) => {
    if (inFlight > 0) {
      pendingRouteApply = work;
      return;
    }
    void enqueue(work);
  };

  return {
    enqueue,
    deferRouteApply,
    get inFlight() {
      return inFlight;
    },
    get isTransitioning() {
      return inFlight > 0;
    },
  };
};
