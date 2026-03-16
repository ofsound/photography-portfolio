/**
 * Tailwind v4 default breakpoints (min-width in px).
 * Single source of truth for JavaScript matchMedia queries.
 *
 * Breakpoint  | Min Width | Use case
 * -----------|-----------|------------------------------------------
 * sm         | 640px     | Small tablets, large phones landscape
 * md         | 768px     | Tablets, small laptops (admin sidebar, mobile header)
 * lg         | 1024px    | Laptops
 * xl         | 1280px    | Desktops
 * 2xl        | 1536px    | Large desktops
 */

/** Tailwind md: 768px. Below this = "mobile" (max-width: 767px). */
const BREAKPOINT_MD_PX = 768;

/**
 * Media query: viewport width below md (i.e. < 768px).
 * Matches Tailwind's `md:` prefix (which applies at 768px+).
 * Use for: mobile header, admin sidebar toggle, CodeEditor line wrap, gallery density.
 */
export const MEDIA_BELOW_MD = `(max-width: ${BREAKPOINT_MD_PX - 1}px)` as const;
