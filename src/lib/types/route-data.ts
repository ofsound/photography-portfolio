/**
 * Shared types for page.data shapes used across layouts.
 * Used when asserting page.data from $app/state, which is a union of all route data.
 */

/** Shape of gallerySettings from viewer routes ([rootSlug] layout). */
export type ViewerGallerySettingsShape = {
  theme_default?: 'light' | 'dark' | 'system' | null;
};

/** Page/custom page shape with editor_mode for public Svedit detection. */
export type EditablePageShape = {
  editor_mode?: string;
};

/** Data shape from viewer routes (home, [rootSlug]) when read via page.data in root layout. */
export type ViewerRouteData = {
  gallerySettings?: ViewerGallerySettingsShape | null;
  canEditPublicPages?: boolean;
  heroPage?: EditablePageShape | null;
  customPage?: EditablePageShape | null;
  viewerMode?: 'gallery' | 'page';
};

/** Slug-bearing records from admin child routes. */
export type AdminSlugRecord = { slug?: string };

/** Data shape from admin routes when read via page.data in admin layout. */
export type AdminRouteData = {
  page?: AdminSlugRecord | null;
  gallery?: AdminSlugRecord | null;
  photo?: AdminSlugRecord | null;
};
