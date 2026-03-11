export const DEFAULT_SLIDE_DURATION_MS = 4000;
export const DEFAULT_TRANSITION_DURATION_MS = 2000;
export const SLIDE_DURATION_MIN_MS = 1000;
export const SLIDE_DURATION_MAX_MS = 30000;
export const TRANSITION_DURATION_MIN_MS = 200;
export const TRANSITION_DURATION_MAX_MS = 10000;
export const DEFAULT_ZOOM_STRENGTH_PCT = 5;
export const DEFAULT_PAN_STRENGTH_PCT = 80;
export const ZOOM_STRENGTH_MIN_PCT = 0;
export const ZOOM_STRENGTH_MAX_PCT = 20;
export const PAN_STRENGTH_MIN_PCT = 0;
export const PAN_STRENGTH_MAX_PCT = 100;

export const clampInt = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, Math.round(value)));
