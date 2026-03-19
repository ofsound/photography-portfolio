import type { LayoutLoad } from './$types';

/** Pairs with AdminHomepageNav + AdminMobileStickyToggleRow (flush under CMS bar on mobile). */
export const load: LayoutLoad = () => {
  return {
    adminMobileFlushToggleChrome: true as const,
  };
};
