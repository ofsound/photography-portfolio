import type { LayoutLoad } from './$types';

/** Pairs with AdminGalleryNav + AdminMobileStickyToggleRow (flush under CMS bar on mobile). */
export const load: LayoutLoad = () => {
  return {
    adminMobileFlushToggleChrome: true as const,
  };
};
