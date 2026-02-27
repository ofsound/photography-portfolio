/**
 * Parse a dimensions string (e.g. "4000 x 6000", "4000x6000", "24 x 36 inches")
 * into width and height numbers. Returns null if unparseable.
 */
export function parseDimensions(dimensions: string | null | undefined): { width: number; height: number } | null {
  if (!dimensions || typeof dimensions !== 'string') return null;
  const trimmed = dimensions.trim();
  if (!trimmed) return null;
  // Match patterns like "4000 x 6000", "4000x6000", "24×36", "24 x 36 inches"
  const match = trimmed.match(/^(\d+)\s*[x×]\s*(\d+)/i);
  if (!match) return null;
  const width = parseInt(match[1], 10);
  const height = parseInt(match[2], 10);
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) return null;
  return { width, height };
}
