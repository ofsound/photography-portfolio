const DEFAULT_THUMBNAIL_MOTION_DURATION_MS = 520;
const DEFAULT_THUMBNAIL_MOTION_EASING = 'cubic-bezier(0.16, 1, 0.3, 1)';

export const THUMBNAIL_MOTION_DURATION_MIN_MS = 1;
export const THUMBNAIL_MOTION_DURATION_MAX_MS = 5000;

const TIMING_KEYWORDS = new Set([
  'linear',
  'ease',
  'ease-in',
  'ease-out',
  'ease-in-out',
  'step-start',
  'step-end',
]);

const STEP_POSITIONS = new Set([
  'jump-start',
  'jump-end',
  'jump-none',
  'jump-both',
  'start',
  'end',
]);

const numberPattern = /^[+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?$/i;

const parseNumber = (token: string): number | null => {
  if (!numberPattern.test(token)) return null;
  const value = Number(token);
  return Number.isFinite(value) ? value : null;
};

const splitArgs = (text: string) =>
  text
    .split(',')
    .map((part) => part.trim())
    .filter((part) => part.length > 0);

const isPercentToken = (token: string): boolean => {
  if (!token.endsWith('%')) return false;
  const numericPart = token.slice(0, -1).trim();
  const parsed = parseNumber(numericPart);
  return parsed !== null && parsed >= 0 && parsed <= 100;
};

const isValidCubicBezier = (value: string): boolean => {
  if (!value.startsWith('cubic-bezier(') || !value.endsWith(')')) {
    return false;
  }

  const body = value.slice('cubic-bezier('.length, -1).trim();
  const parts = splitArgs(body);
  if (parts.length !== 4) return false;

  const numbers = parts.map(parseNumber);
  if (numbers.some((entry) => entry == null)) return false;

  const [x1, _y1, x2, _y2] = numbers as [number, number, number, number];
  return x1 >= 0 && x1 <= 1 && x2 >= 0 && x2 <= 1;
};

const isValidSteps = (value: string): boolean => {
  if (!value.startsWith('steps(') || !value.endsWith(')')) return false;

  const body = value.slice('steps('.length, -1).trim();
  const parts = splitArgs(body);
  if (parts.length < 1 || parts.length > 2) return false;

  const count = Number(parts[0]);
  if (!Number.isInteger(count) || count <= 0) return false;

  if (parts.length === 1) return true;
  return STEP_POSITIONS.has(parts[1]);
};

const isValidLinearFunction = (value: string): boolean => {
  if (!value.startsWith('linear(') || !value.endsWith(')')) return false;

  const body = value.slice('linear('.length, -1).trim();
  if (!body) return false;

  const segments = splitArgs(body);
  if (segments.length === 0) return false;

  for (const segment of segments) {
    const tokens = segment.split(/\s+/g).filter(Boolean);
    if (tokens.length === 0 || tokens.length > 3) return false;

    const output = parseNumber(tokens[0]);
    if (output == null || output < 0 || output > 1) return false;

    if (tokens.length >= 2 && !isPercentToken(tokens[1])) return false;
    if (tokens.length === 3 && !isPercentToken(tokens[2])) return false;
  }

  return true;
};

export const isValidCssTimingFunction = (value: string): boolean => {
  const normalized = value.trim();
  if (!normalized) return false;

  if (TIMING_KEYWORDS.has(normalized)) return true;
  if (isValidCubicBezier(normalized)) return true;
  if (isValidSteps(normalized)) return true;
  if (isValidLinearFunction(normalized)) return true;

  return false;
};

export const normalizeThumbnailMotionDuration = (
  value: unknown,
  fallback: number = DEFAULT_THUMBNAIL_MOTION_DURATION_MS,
) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;

  const rounded = Math.round(parsed);
  return Math.min(
    THUMBNAIL_MOTION_DURATION_MAX_MS,
    Math.max(THUMBNAIL_MOTION_DURATION_MIN_MS, rounded),
  );
};

export const normalizeThumbnailMotionEasing = (
  value: unknown,
  fallback: string = DEFAULT_THUMBNAIL_MOTION_EASING,
) => {
  if (typeof value !== 'string') return fallback;
  const normalized = value.trim();
  return isValidCssTimingFunction(normalized) ? normalized : fallback;
};
