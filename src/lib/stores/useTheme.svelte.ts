import { page } from '$app/state';

import {
  adminThemeModeStore,
  type AdminThemeMode,
} from '$lib/stores/admin-theme-mode.svelte';

const isThemeMode = (value: unknown): value is AdminThemeMode =>
  value === 'light' || value === 'dark' || value === 'system';

const isAdminPath = (pathname: string) =>
  pathname === '/admin' || pathname.startsWith('/admin/');

const applyTheme = (mode: AdminThemeMode) => {
  const isDarkSystem = window.matchMedia(
    '(prefers-color-scheme: dark)',
  ).matches;
  const active = mode === 'system' ? (isDarkSystem ? 'dark' : 'light') : mode;
  document.documentElement.setAttribute('data-theme', active);
  document.documentElement.style.colorScheme = active;
};

const readAdminTheme = (): AdminThemeMode => {
  const stored = localStorage.getItem('admin-theme');
  return stored === 'light' || stored === 'dark' || stored === 'system'
    ? stored
    : 'system';
};

type ThemeOptions = {
  getGlobalSiteSettings: () => {
    site_theme_default?: string | null;
    transition_preset?: string | null;
  } | null;
  getViewerGallerySettings: () => {
    theme_default?: string | null;
  } | null;
  isViewerRoute: (pathname: string) => boolean;
};

export function createThemeManager(options: ThemeOptions) {
  let hasHydratedClientPrefs = $state(false);
  let transitionPreset = $state<'cinematic' | 'snappy' | 'experimental'>(
    'cinematic',
  );

  const publicSiteThemeDefault = $derived(
    isThemeMode(options.getGlobalSiteSettings()?.site_theme_default)
      ? (options.getGlobalSiteSettings()!.site_theme_default as AdminThemeMode)
      : 'system',
  );

  const galleryRouteThemeDefault = $derived(
    isThemeMode(options.getViewerGallerySettings()?.theme_default)
      ? (options.getViewerGallerySettings()!.theme_default as AdminThemeMode)
      : null,
  );

  const siteThemeDefault = $derived(
    options.isViewerRoute(page.url.pathname) && galleryRouteThemeDefault
      ? galleryRouteThemeDefault
      : publicSiteThemeDefault,
  );

  const resolveThemeMode = (): AdminThemeMode => {
    const onAdmin = isAdminPath(page.url.pathname);
    if (onAdmin) return readAdminTheme();
    return siteThemeDefault;
  };

  const applyTransitionPreset = () => {
    document.documentElement.dataset.vtPreset = transitionPreset;
  };

  $effect(() => {
    if (hasHydratedClientPrefs) return;

    transitionPreset =
      options.getGlobalSiteSettings()?.transition_preset === 'snappy'
        ? 'snappy'
        : options.getGlobalSiteSettings()?.transition_preset === 'experimental'
          ? 'experimental'
          : 'cinematic';

    const resolved = resolveThemeMode();
    adminThemeModeStore.set(resolved);
    applyTransitionPreset();
    applyTheme(resolved);
    hasHydratedClientPrefs = true;
  });

  $effect(() => {
    if (!hasHydratedClientPrefs) return;
    const resolved = resolveThemeMode();
    adminThemeModeStore.set(resolved);
    applyTheme(resolved);
  });

  $effect(() => {
    if (!hasHydratedClientPrefs) return;
    if (!isAdminPath(page.url.pathname)) return;
    const selectedThemeMode = adminThemeModeStore.value;
    localStorage.setItem('admin-theme', selectedThemeMode);
    applyTheme(selectedThemeMode);
  });

  $effect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const listener = () => {
      if (adminThemeModeStore.value === 'system') {
        applyTheme('system');
      }
    };
    media.addEventListener('change', listener);
    return () => media.removeEventListener('change', listener);
  });

  $effect(() => {
    transitionPreset =
      options.getGlobalSiteSettings()?.transition_preset === 'snappy'
        ? 'snappy'
        : options.getGlobalSiteSettings()?.transition_preset === 'experimental'
          ? 'experimental'
          : 'cinematic';
    applyTransitionPreset();
  });

  return {
    get siteThemeDefault() {
      return siteThemeDefault;
    },
    get transitionPreset() {
      return transitionPreset;
    },
  };
}
