import { invalidateAll } from '$app/navigation';

const POLL_INTERVAL_MS = 8000;

export function createConversionPoller(
  getHasSession: () => boolean,
  getPendingCount: () => number,
) {
  $effect(() => {
    if (!getHasSession() || getPendingCount() <= 0) return;

    const timer = setInterval(() => {
      invalidateAll();
    }, POLL_INTERVAL_MS);

    return () => clearInterval(timer);
  });
}
