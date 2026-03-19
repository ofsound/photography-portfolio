import { page } from '$app/state';

import { MEDIA_BELOW_MD } from '$lib/constants/breakpoints';

const isAdminPath = (pathname: string) =>
  pathname === '/admin' || pathname.startsWith('/admin/');

export function createSiteHeader() {
  let siteHeaderEl = $state<HTMLElement | null>(null);

  const isHomePage = $derived(page.url.pathname === '/');
  const isAdminRoute = $derived(isAdminPath(page.url.pathname));

  const syncHeight = () => {
    const mobile = window.matchMedia(MEDIA_BELOW_MD).matches;

    if (mobile) {
      const value =
        isHomePage && !isAdminRoute
          ? '0px'
          : 'var(--size-mobile-header-offset)';
      document.documentElement.style.setProperty('--site-header-height', value);
      return;
    }

    if (!siteHeaderEl) return;
    document.documentElement.style.setProperty(
      '--site-header-height',
      `${siteHeaderEl.getBoundingClientRect().height}px`,
    );
  };

  $effect(() => {
    syncHeight();
    const observer = siteHeaderEl ? new ResizeObserver(syncHeight) : null;
    if (observer && siteHeaderEl) {
      observer.observe(siteHeaderEl);
    }
    window.addEventListener('resize', syncHeight);
    return () => {
      observer?.disconnect();
      window.removeEventListener('resize', syncHeight);
    };
  });

  $effect(() => {
    const _pathname = page.url.pathname;
    if (_pathname) {
      syncHeight();
    }
  });

  return {
    get el() {
      return siteHeaderEl;
    },
    set el(value: HTMLElement | null) {
      siteHeaderEl = value;
    },
  };
}
