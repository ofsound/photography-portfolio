import type { Action } from 'svelte/action';

type SwipeGestureConfig = {
  enabled?: boolean;
  minDistance?: number;
  maxDurationMs?: number;
  ignoreSelector?: string;
  onPrev?: () => void;
  onNext?: () => void;
};

const DEFAULT_MIN_DISTANCE = 48;
const DEFAULT_MAX_DURATION_MS = 700;
const DEFAULT_IGNORE_SELECTOR = '[data-swipe-ignore]';

export const useSwipeGesture: Action<HTMLElement, SwipeGestureConfig> = (
  node,
  initialConfig = {},
) => {
  let config = initialConfig;
  let touchStartX = 0;
  let touchStartY = 0;
  let touchStartedAt = 0;
  let touchActive = false;

  const shouldIgnoreSwipe = (target: EventTarget | null) =>
    target instanceof HTMLElement &&
    !!target.closest(config.ignoreSelector ?? DEFAULT_IGNORE_SELECTOR);

  const onTouchStart = (event: TouchEvent) => {
    if (
      !config.enabled ||
      shouldIgnoreSwipe(event.target) ||
      event.touches.length !== 1
    ) {
      touchActive = false;
      return;
    }

    const touch = event.touches[0];
    touchStartX = touch.clientX;
    touchStartY = touch.clientY;
    touchStartedAt = Date.now();
    touchActive = true;
  };

  const onTouchEnd = (event: TouchEvent) => {
    if (!config.enabled || !touchActive) return;
    touchActive = false;

    const touch = event.changedTouches[0];
    if (!touch) return;

    const deltaX = touch.clientX - touchStartX;
    const deltaY = touch.clientY - touchStartY;
    const elapsed = Date.now() - touchStartedAt;
    const absX = Math.abs(deltaX);
    const absY = Math.abs(deltaY);
    const minDistance = config.minDistance ?? DEFAULT_MIN_DISTANCE;
    const maxDurationMs = config.maxDurationMs ?? DEFAULT_MAX_DURATION_MS;

    const isHorizontalSwipe =
      absX >= minDistance && absX > absY * 1.2 && elapsed <= maxDurationMs;
    if (!isHorizontalSwipe) return;

    if (deltaX < 0) {
      config.onNext?.();
      return;
    }

    config.onPrev?.();
  };

  node.addEventListener('touchstart', onTouchStart, { passive: true });
  node.addEventListener('touchend', onTouchEnd, { passive: true });

  return {
    update(nextConfig) {
      config = nextConfig ?? {};
    },
    destroy() {
      node.removeEventListener('touchstart', onTouchStart);
      node.removeEventListener('touchend', onTouchEnd);
    },
  };
};
