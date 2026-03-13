<script lang="ts">
  import { goto, invalidateAll, onNavigate } from '$app/navigation';
  import { resolve } from '$app/paths';
  import { page } from '$app/state';

  import ZoomControl from '$lib/components/ZoomControl.svelte';
  import MobileDropdownMenu from '$lib/components/navigation/MobileDropdownMenu.svelte';

  import {
    setGalleryTransitionContext,
    type GalleryTransitionPhase,
  } from '$lib/context/gallery-transition';
  import {
    adminThemeModeStore,
    type AdminThemeMode,
  } from '$lib/stores/admin-theme-mode.svelte';
  import {
    getGalleryPrefs,
    galleryDensityStore,
    layoutModeStore,
    setGalleryPrefs,
  } from '$lib/stores/gallery-prefs.svelte';
  import {
    buildGalleryPath,
    buildGalleryPhotoPath,
    isGalleryDetailPath,
  } from '$lib/utils/gallery-routes';
  import {
    DEFAULT_BRAND_CONTRAST_DARK_HEX,
    DEFAULT_BRAND_CONTRAST_LIGHT_HEX,
    DEFAULT_BRAND_DARK_HEX,
    DEFAULT_BRAND_LIGHT_HEX,
    normalizeHexColor,
  } from '$lib/constants/theme-colors';
  import {
    DEFAULT_ADMIN_FONT_FAMILY,
    DEFAULT_ADMIN_FONT_IMPORT_URL,
    DEFAULT_PUBLIC_FONT_FAMILY,
    DEFAULT_PUBLIC_FONT_IMPORT_URL,
    normalizeFontFamilyDefinition,
    normalizeFontImportUrl,
  } from '$lib/constants/typography-settings';

  import type { LayoutData } from './$types';

  import '../app.css';

  const { data, children } = $props<{
    data: LayoutData | null;
    children: import('svelte').Snippet;
  }>();

  const isDetailRoute = (pathname: string) => isGalleryDetailPath(pathname);

  let phase = $state<GalleryTransitionPhase>(
    isDetailRoute(page.url.pathname) ? 'open' : 'idle',
  );
  setGalleryTransitionContext(
    () => phase,
    (p) => {
      phase = p;
    },
  );
  const chromeHidden = $derived(
    phase === 'fade-out-chrome' ||
      phase === 'scale-and-mask' ||
      phase === 'open' ||
      phase === 'closing-chrome' ||
      phase === 'closing-scale',
  );
  const navPages = $derived(
    (data?.navPages ?? []) as Array<{
      id: string;
      slug: string;
      title: string;
      nav_order: number;
    }>,
  );
  const navGalleries = $derived(
    (data?.navGalleries ?? []) as Array<{
      id: string;
      slug: string;
      name: string;
      nav_order: number;
    }>,
  );
  const allGallerySlugs = $derived(
    new Set(((data?.allGallerySlugs ?? []) as string[]).filter(Boolean)),
  );
  const isViewerRoute = (pathname: string) => {
    const segments = pathname.split('/').filter(Boolean);
    if (segments.length === 0) return false;

    const rootSlug = segments[0];
    const isGalleryRoot = rootSlug === 'all' || allGallerySlugs.has(rootSlug);
    if (!isGalleryRoot) return false;

    return (
      segments.length === 1 || (segments.length >= 3 && segments[1] === 'photo')
    );
  };
  const globalSiteSettings = $derived(data?.siteSettings ?? null);
  const viewerGallerySettings = $derived(
    ((page.data as Record<string, unknown> | null)?.gallerySettings ??
      null) as {
      theme_default?: 'light' | 'dark' | 'system' | null;
      transition_preset?: 'cinematic' | 'snappy' | 'experimental' | null;
      allow_transition_toggle?: boolean | null;
    } | null,
  );
  const siteSettings = $derived(
    isViewerRoute(page.url.pathname) && viewerGallerySettings
      ? {
          ...globalSiteSettings,
          ...viewerGallerySettings,
        }
      : globalSiteSettings,
  );
  const showSearchLinkInNav = $derived(
    siteSettings?.show_search_link_in_nav ?? true,
  );
  const publicFontImportUrl = $derived(
    normalizeFontImportUrl(
      siteSettings?.public_font_import_url,
      DEFAULT_PUBLIC_FONT_IMPORT_URL,
    ),
  );
  const adminFontImportUrl = $derived(
    normalizeFontImportUrl(
      siteSettings?.admin_font_import_url,
      DEFAULT_ADMIN_FONT_IMPORT_URL,
    ),
  );
  const publicFontFamily = $derived(
    normalizeFontFamilyDefinition(
      siteSettings?.public_font_family,
      DEFAULT_PUBLIC_FONT_FAMILY,
    ),
  );
  const adminFontFamily = $derived(
    normalizeFontFamilyDefinition(
      siteSettings?.admin_font_family,
      DEFAULT_ADMIN_FONT_FAMILY,
    ),
  );
  const brandLightHex = $derived(
    normalizeHexColor(siteSettings?.brand_light_hex, DEFAULT_BRAND_LIGHT_HEX),
  );
  const brandDarkHex = $derived(
    normalizeHexColor(siteSettings?.brand_dark_hex, DEFAULT_BRAND_DARK_HEX),
  );
  const brandContrastLightHex = $derived(
    normalizeHexColor(
      siteSettings?.brand_contrast_light_hex,
      DEFAULT_BRAND_CONTRAST_LIGHT_HEX,
    ),
  );
  const brandContrastDarkHex = $derived(
    normalizeHexColor(
      siteSettings?.brand_contrast_dark_hex,
      DEFAULT_BRAND_CONTRAST_DARK_HEX,
    ),
  );
  const fontImportUrls = $derived.by(() => {
    const unique = new Set([publicFontImportUrl, adminFontImportUrl]);
    return [...unique];
  });
  const hasSession = $derived(Boolean(data?.session));
  const pendingConversionCount = $derived(
    (data?.pendingConversionCount as number) ?? 0,
  );
  const maxDensity = 10;
  let transitionPreset = $state<'cinematic' | 'snappy' | 'experimental'>(
    'cinematic',
  );
  let hasHydratedClientPrefs = $state(false);
  let siteHeaderEl: HTMLElement | null = null;
  let publicMobileMenuOpen = $state(false);

  const isViewer = $derived(isViewerRoute(page.url.pathname));
  const isAdminRoute = $derived(page.url.pathname.startsWith('/admin/'));
  const cmsRole = $derived(
    ((data as Record<string, unknown> | null)?.cmsRole ?? null) as
      | 'admin'
      | 'editor'
      | null,
  );
  const canAccessPublicEditor = $derived(
    cmsRole === 'admin' || cmsRole === 'editor',
  );
  const currentRouteData = $derived(
    (page.data as Record<string, unknown> | null) ?? null,
  );
  const canEditPublicPages = $derived(
    Boolean(currentRouteData?.canEditPublicPages),
  );
  const publicSveditEditable = $derived.by(() => {
    if (!canEditPublicPages || isAdminRoute) return false;

    const heroPage =
      (currentRouteData?.heroPage as { editor_mode?: string } | null) ?? null;
    if (heroPage?.editor_mode === 'svedit') return true;

    const customPage =
      (currentRouteData?.customPage as { editor_mode?: string } | null) ?? null;
    return (
      currentRouteData?.viewerMode === 'page' &&
      customPage?.editor_mode === 'svedit'
    );
  });
  const publicEditModeEnabled = $derived(
    publicSveditEditable && page.url.searchParams.get('edit') === '1',
  );
  const encodePathSegment = (segment: string) => {
    try {
      return encodeURIComponent(decodeURIComponent(segment));
    } catch {
      return encodeURIComponent(segment);
    }
  };
  const adminEditorPath = $derived.by(() => {
    if (!canAccessPublicEditor) return null;

    const pathname = page.url.pathname;
    if (pathname.startsWith('/admin/') || pathname.startsWith('/auth/')) {
      return null;
    }
    if (pathname === '/auth' || pathname === '/search') return null;

    const segments = pathname.split('/').filter(Boolean);
    if (segments.length === 0) return '/admin/homepage';

    const rootSlug = segments[0];
    const rootSlugEncoded = encodePathSegment(rootSlug);

    if (segments.length === 1) {
      if (allGallerySlugs.has(rootSlug)) {
        return `/admin/${rootSlugEncoded}/details`;
      }
      return `/admin/pages/edit/${rootSlugEncoded}`;
    }

    if (
      segments[1] === 'photo' &&
      segments[2] &&
      allGallerySlugs.has(rootSlug)
    ) {
      return `/admin/${rootSlugEncoded}/photos/edit/${encodePathSegment(segments[2])}`;
    }

    if (segments[1] === 'feed' && allGallerySlugs.has(rootSlug)) {
      return `/admin/${rootSlugEncoded}/details`;
    }

    return null;
  });
  const adminPublicPath = $derived.by(() => {
    if (!isAdminRoute) return null;

    const pathname = page.url.pathname;
    const segments = pathname.split('/').filter(Boolean);
    if (segments[0] !== 'admin') return null;

    if (segments.length === 2 && segments[1] === 'homepage') {
      return '/';
    }

    const typedData = (page.data as Record<string, unknown> | null) ?? null;
    const pageData = (typedData?.page as { slug?: string } | null) ?? null;
    const galleryData =
      (typedData?.gallery as { slug?: string } | null) ?? null;
    const photoData = (typedData?.photo as { slug?: string } | null) ?? null;

    if (
      segments.length === 4 &&
      segments[1] === 'pages' &&
      segments[2] === 'edit' &&
      pageData?.slug
    ) {
      return `/${encodePathSegment(pageData.slug)}`;
    }

    if (
      segments.length === 3 &&
      segments[2] === 'details' &&
      galleryData?.slug
    ) {
      return buildGalleryPath(galleryData.slug);
    }

    if (
      segments.length === 3 &&
      segments[2] === 'photos' &&
      galleryData?.slug
    ) {
      return buildGalleryPath(galleryData.slug);
    }

    if (
      segments.length === 5 &&
      segments[2] === 'photos' &&
      segments[3] === 'edit' &&
      galleryData?.slug &&
      photoData?.slug
    ) {
      return buildGalleryPhotoPath(galleryData.slug, photoData.slug);
    }

    return null;
  });

  $effect(() => {
    if (typeof window === 'undefined' || !isViewer) return;
    const prefs = getGalleryPrefs(maxDensity);
    if (prefs) {
      galleryDensityStore.set(prefs.density);
    }
  });

  $effect(() => {
    if (typeof document === 'undefined') return;
    document.documentElement.style.setProperty(
      '--font-sans-public',
      publicFontFamily,
    );
    document.documentElement.style.setProperty(
      '--font-sans-admin',
      adminFontFamily,
    );
    document.documentElement.style.setProperty(
      '--color-brand-light',
      brandLightHex,
    );
    document.documentElement.style.setProperty(
      '--color-brand-dark',
      brandDarkHex,
    );
    document.documentElement.style.setProperty(
      '--color-brand-contrast-light',
      brandContrastLightHex,
    );
    document.documentElement.style.setProperty(
      '--color-brand-contrast-dark',
      brandContrastDarkHex,
    );
  });

  const toUiZoomValue = (density: number) =>
    maxDensity + 1 - Math.max(1, Math.min(maxDensity, Math.round(density)));

  const toDensityValue = (uiZoom: number) =>
    maxDensity + 1 - Math.max(1, Math.min(maxDensity, Math.round(uiZoom)));

  const updateHeaderDensity = (nextUiZoom: number) => {
    setGalleryPrefs({ density: toDensityValue(nextUiZoom) }, maxDensity);
  };

  const updateHeaderLayoutMode = (
    mode: 'uniform' | 'masonry' | 'coverage' | 'rows' | 'columns',
  ) => {
    setGalleryPrefs({ layoutMode: mode }, maxDensity);
  };
  const setPublicEditMode = (next: boolean) => {
    if (!publicSveditEditable) return;

    const nextUrl = new URL(page.url);
    if (next) {
      nextUrl.searchParams.set('edit', '1');
    } else {
      nextUrl.searchParams.delete('edit');
    }

    const search = nextUrl.search;
    const target = `${nextUrl.pathname}${search}`;
    goto(resolve(target as `/${string}`), { replaceState: true });
  };

  const applyTransitionPreset = () => {
    document.documentElement.dataset.vtPreset = transitionPreset;
  };

  const clearTransitionMeta = () => {
    delete document.documentElement.dataset.vt;
    delete document.documentElement.dataset.vtDirection;
    delete document.documentElement.dataset.vtReduced;
  };

  const applyTheme = (mode: AdminThemeMode) => {
    const isDarkSystem = window.matchMedia(
      '(prefers-color-scheme: dark)',
    ).matches;
    const active = mode === 'system' ? (isDarkSystem ? 'dark' : 'light') : mode;
    document.documentElement.setAttribute('data-theme', active);
    document.documentElement.style.colorScheme = active;
  };

  const siteThemeDefault = $derived(
    (siteSettings?.theme_default === 'dark' ||
    siteSettings?.theme_default === 'light' ||
    siteSettings?.theme_default === 'system'
      ? siteSettings.theme_default
      : 'system') as 'light' | 'dark' | 'system',
  );

  const updateTransitionPreset = (
    preset: 'cinematic' | 'snappy' | 'experimental',
  ) => {
    transitionPreset = preset;
    if (siteSettings?.allow_transition_toggle) {
      localStorage.setItem('transition-preset', preset);
    }
    applyTransitionPreset();
  };

  const syncSiteHeaderHeight = () => {
    if (typeof document === 'undefined' || typeof window === 'undefined')
      return;
    const isMobile = window.matchMedia('(max-width: 767px)').matches;

    if (isMobile) {
      document.documentElement.style.setProperty(
        '--site-header-height',
        isAdminRoute ? '0px' : 'var(--size-mobile-header-offset)',
      );
      return;
    }

    if (!siteHeaderEl) return;
    document.documentElement.style.setProperty(
      '--site-header-height',
      `${siteHeaderEl.getBoundingClientRect().height}px`,
    );
  };

  $effect(() => {
    if (typeof window === 'undefined' || hasHydratedClientPrefs) return;

    const pathname = page.url.pathname;
    const onAdmin = pathname.startsWith('/admin/');
    transitionPreset = siteSettings?.transition_preset ?? 'cinematic';
    let resolvedThemeMode: AdminThemeMode = siteThemeDefault;

    if (onAdmin) {
      const stored = localStorage.getItem('admin-theme');
      resolvedThemeMode =
        stored === 'light' || stored === 'dark' || stored === 'system'
          ? stored
          : siteThemeDefault;
    }
    adminThemeModeStore.set(resolvedThemeMode);

    if (siteSettings?.allow_transition_toggle) {
      const storedPreset = localStorage.getItem('transition-preset');
      if (
        storedPreset === 'cinematic' ||
        storedPreset === 'snappy' ||
        storedPreset === 'experimental'
      ) {
        transitionPreset = storedPreset;
      }
    } else {
      localStorage.removeItem('transition-preset');
    }

    applyTransitionPreset();
    applyTheme(resolvedThemeMode);
    hasHydratedClientPrefs = true;
  });

  $effect(() => {
    if (typeof window === 'undefined' || !hasHydratedClientPrefs) return;
    const pathname = page.url.pathname;
    const onAdmin = pathname.startsWith('/admin/');
    let resolvedThemeMode: AdminThemeMode = siteThemeDefault;
    if (onAdmin) {
      const stored = localStorage.getItem('admin-theme');
      resolvedThemeMode =
        stored === 'light' || stored === 'dark' || stored === 'system'
          ? stored
          : siteThemeDefault;
    }
    adminThemeModeStore.set(resolvedThemeMode);
    applyTheme(resolvedThemeMode);
  });

  $effect(() => {
    if (typeof window === 'undefined' || !hasHydratedClientPrefs) return;
    if (!page.url.pathname.startsWith('/admin/')) return;
    const selectedThemeMode = adminThemeModeStore.value;
    localStorage.setItem('admin-theme', selectedThemeMode);
    applyTheme(selectedThemeMode);
  });

  $effect(() => {
    if (typeof window === 'undefined') return;
    if (!hasSession || pendingConversionCount <= 0) return;

    const timer = setInterval(() => {
      invalidateAll();
    }, 8000);

    return () => clearInterval(timer);
  });

  $effect(() => {
    if (typeof window === 'undefined') return;
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
    if (typeof document === 'undefined') return;
    if (!siteSettings?.allow_transition_toggle) {
      transitionPreset = siteSettings?.transition_preset ?? transitionPreset;
    }
    applyTransitionPreset();
  });

  $effect(() => {
    if (typeof window === 'undefined') return;
    syncSiteHeaderHeight();
    const observer = siteHeaderEl
      ? new ResizeObserver(syncSiteHeaderHeight)
      : null;
    if (observer && siteHeaderEl) {
      observer.observe(siteHeaderEl);
    }
    window.addEventListener('resize', syncSiteHeaderHeight);
    return () => {
      observer?.disconnect();
      window.removeEventListener('resize', syncSiteHeaderHeight);
    };
  });

  $effect(() => {
    const pathname = page.url.pathname;
    if (pathname) {
      syncSiteHeaderHeight();
    }
  });

  onNavigate((navigation) => {
    const fromPath = navigation.from?.url.pathname ?? window.location.pathname;
    const toPath = navigation.to?.url.pathname ?? fromPath;

    // Gallery and photo routes use a persistent same-node animator, not View Transitions.
    if (isViewerRoute(fromPath) || isViewerRoute(toPath)) {
      return;
    }

    // Admin nav: skip View Transitions so rapid clicks always register and lead to route changes.
    if (fromPath.startsWith('/admin/') || toPath.startsWith('/admin/')) {
      return;
    }

    if (!document.startViewTransition) {
      return;
    }

    const reducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches;

    document.documentElement.dataset.vt = 'default';
    delete document.documentElement.dataset.vtDirection;
    if (reducedMotion) {
      document.documentElement.dataset.vtReduced = '1';
    } else {
      delete document.documentElement.dataset.vtReduced;
    }

    return new Promise((resolve) => {
      const transition = document.startViewTransition(async () => {
        resolve();
        try {
          await navigation.complete;
        } catch {
          // If the navigation is cancelled, the VT is aborted anyway.
        }
      });

      transition.finished.finally(() => {
        clearTransitionMeta();
      });
    });
  });
</script>

<svelte:head>
  <script
    data-brand-light={brandLightHex}
    data-brand-dark={brandDarkHex}
    data-brand-contrast-light={brandContrastLightHex}
    data-brand-contrast-dark={brandContrastDarkHex}
  >
    {
      const script = document.currentScript;
      if (script instanceof HTMLScriptElement) {
        const root = document.documentElement;
        root.style.setProperty(
          '--color-brand-light',
          script.dataset.brandLight ?? '#4f46e5',
        );
        root.style.setProperty(
          '--color-brand-dark',
          script.dataset.brandDark ?? '#a5b4fc',
        );
        root.style.setProperty(
          '--color-brand-contrast-light',
          script.dataset.brandContrastLight ?? '#eef2ff',
        );
        root.style.setProperty(
          '--color-brand-contrast-dark',
          script.dataset.brandContrastDark ?? '#1e1b4b',
        );
      }
    }
  </script>
  <meta name="site-theme-default" content={siteThemeDefault} />
  <meta name="site-font-public-family" content={publicFontFamily} />
  <meta name="site-font-admin-family" content={adminFontFamily} />
  {#each fontImportUrls as fontImportUrl (fontImportUrl)}
    <link rel="stylesheet" href={fontImportUrl} />
  {/each}
</svelte:head>

<div class="min-h-screen bg-bg text-text">
  <header
    class="chrome-panel fixed inset-x-0 top-0 z-[60] border-b border-border px-4 pt-[env(safe-area-inset-top)] transition-opacity duration-(--duration-chrome) ease-out md:hidden"
    class:hidden={isAdminRoute}
    class:opacity-0={chromeHidden}
  >
    <div
      class="mx-auto flex h-[var(--size-mobile-header)] w-full items-center justify-between gap-3"
    >
      <a
        href={resolve('/')}
        class="text-xs tracking-[0.22em] uppercase"
        aria-label="Go to Home"
      >
        Home
      </a>

      <div class="flex items-center justify-end gap-2">
        {#if publicSveditEditable}
          <button
            type="button"
            class="inline-flex min-h-11 min-w-11 items-center justify-center rounded-md border border-border bg-surface text-text transition-colors hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
            aria-label={publicEditModeEnabled
              ? 'Exit public edit mode'
              : 'Enter public edit mode'}
            title={publicEditModeEnabled
              ? 'Exit public edit mode'
              : 'Enter public edit mode'}
            onclick={() => setPublicEditMode(!publicEditModeEnabled)}
          >
            <svg
              class="size-4.5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              aria-hidden="true"
            >
              {#if publicEditModeEnabled}
                <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6z" />
                <circle cx="12" cy="12" r="3" />
              {:else}
                <path d="M12 20h9" />
                <path d="M16.5 3.5a2.12 2.12 0 113 3L7 19l-4 1 1-4z" />
              {/if}
            </svg>
          </button>
          {#if publicEditModeEnabled}
            <button
              type="submit"
              form="public-svedit-form"
              class="inline-flex min-h-11 min-w-11 items-center justify-center rounded-md border border-border bg-surface text-text transition-colors hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
              aria-label="Save public page changes"
              title="Save public page changes"
            >
              <svg
                class="size-4.5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                aria-hidden="true"
              >
                <path
                  d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"
                />
                <path d="M17 21v-8H7v8" />
                <path d="M7 3v5h8" />
              </svg>
            </button>
          {/if}
          {#if adminEditorPath}
            <span class="h-6 w-px bg-border" aria-hidden="true"></span>
          {/if}
        {/if}
        {#if adminEditorPath}
          <a
            href={resolve(adminEditorPath as `/${string}`)}
            class="inline-flex min-h-11 min-w-11 items-center justify-center rounded-md border border-border bg-surface text-text transition-colors hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
            aria-label="Edit current page in admin"
            title="Edit current page in admin"
          >
            <svg
              class="size-4.5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              aria-hidden="true"
            >
              <path d="M12 20h9" />
              <path d="M16.5 3.5a2.12 2.12 0 113 3L7 19l-4 1 1-4z" />
            </svg>
          </a>
        {/if}

        <MobileDropdownMenu
          id="public-mobile-nav"
          label="Toggle site navigation"
          bind:open={publicMobileMenuOpen}
        >
          <nav
            aria-label="Site mobile navigation"
            class="flex flex-col border-b border-border font-medium"
          >
            <a
              href={resolve('/')}
              class="border-t border-border py-4 text-xl first:border-t-0"
              >Home</a
            >
            {#each navGalleries as navGallery (navGallery.id)}
              <a
                href={resolve(
                  buildGalleryPath(navGallery.slug) as `/${string}`,
                )}
                class="border-t border-border py-4 text-xl"
              >
                {navGallery.name}
              </a>
            {/each}
            {#each navPages as navPage (navPage.id)}
              <a
                href={resolve(`/${navPage.slug}`)}
                class="border-t border-border py-4 text-xl"
                >{navPage.title}</a
              >
            {/each}
            {#if showSearchLinkInNav}
              <a
                href={resolve('/search')}
                class="border-t border-border py-4 text-xl">Search</a
              >
            {/if}
            {#if hasSession}
              <a
                href={resolve('/admin/galleries')}
                class="border-t border-border py-4 text-xl"
              >
                Admin
              </a>
            {/if}
          </nav>

          {#if isViewer}
            <div class="grid gap-3 pt-3">
              <label
                for="header-layout-mobile"
                class="text-xs tracking-widest uppercase"
              >
                Layout
              </label>
              <select
                id="header-layout-mobile"
                class="h-10 rounded border border-border-strong bg-transparent px-3 text-sm tracking-wider uppercase"
                aria-label="Gallery layout"
                value={layoutModeStore.value}
                onchange={(e) =>
                  updateHeaderLayoutMode(
                    (e.currentTarget as HTMLSelectElement).value as
                      | 'uniform'
                      | 'masonry'
                      | 'coverage'
                      | 'rows'
                      | 'columns',
                  )}
              >
                <option value="uniform">Uniform</option>
                <option value="masonry">Masonry</option>
                <option value="coverage">Coverage</option>
                <option value="rows">Rows</option>
                <option value="columns">Columns</option>
              </select>
              <ZoomControl
                label="Zoom"
                min={1}
                max={maxDensity}
                value={toUiZoomValue(galleryDensityStore.value)}
                onUpdate={updateHeaderDensity}
              />
            </div>
          {:else if siteSettings?.allow_transition_toggle}
            <div class="grid gap-2 pt-3">
              <label
                for="transition-mobile"
                class="text-xs tracking-widest uppercase">Motion</label
              >
              <select
                id="transition-mobile"
                class="h-10 rounded border border-border-strong bg-transparent px-3 text-sm"
                bind:value={transitionPreset}
                onchange={(event) =>
                  updateTransitionPreset(
                    (event.currentTarget as HTMLSelectElement)
                      .value as typeof transitionPreset,
                  )}
              >
                <option value="cinematic">Cinematic</option>
                <option value="snappy">Snappy</option>
                <option value="experimental">Experimental</option>
              </select>
            </div>
          {/if}
        </MobileDropdownMenu>
      </div>
    </div>
  </header>

  <header
    bind:this={siteHeaderEl}
    class="chrome-panel sticky top-0 z-40 hidden border-b border-border px-4 transition-opacity duration-(--duration-chrome) ease-out md:block"
    class:opacity-0={chromeHidden}
  >
    <div class="mx-auto flex w-full items-center justify-between gap-3">
      <nav
        aria-label="Site primary navigation"
        class="flex items-center gap-6 py-3 text-sm tracking-widest uppercase"
      >
        <a href={resolve('/')}>Home</a>

        {#each navGalleries as navGallery (navGallery.id)}
          <a href={resolve(buildGalleryPath(navGallery.slug) as `/${string}`)}
            >{navGallery.name}</a
          >
        {/each}
        {#each navPages as navPage (navPage.id)}
          <a href={resolve(`/${navPage.slug}`)}>{navPage.title}</a>
        {/each}
        {#if showSearchLinkInNav}
          <a href={resolve('/search')}>Search</a>
        {/if}
        {#if hasSession}
          <a href={resolve('/admin/galleries')}>Admin</a>
        {/if}
      </nav>

      {#if isViewer}
        <div class="ml-4 flex items-center justify-end gap-3">
          <label for="header-layout" class="sr-only">Layout</label>
          <select
            id="header-layout"
            class="h-6 min-w-0 rounded border border-border-strong bg-transparent px-2 py-0.5 text-xs tracking-wider uppercase"
            aria-label="Gallery layout"
            value={layoutModeStore.value}
            onchange={(e) =>
              updateHeaderLayoutMode(
                (e.currentTarget as HTMLSelectElement).value as
                  | 'uniform'
                  | 'masonry'
                  | 'coverage'
                  | 'rows'
                  | 'columns',
              )}
          >
            <option value="uniform">Uniform</option>
            <option value="masonry">Masonry</option>
            <option value="coverage">Coverage</option>
            <option value="rows">Rows</option>
            <option value="columns">Columns</option>
          </select>
          <ZoomControl
            label="Zoom"
            min={1}
            max={maxDensity}
            value={toUiZoomValue(galleryDensityStore.value)}
            onUpdate={updateHeaderDensity}
          />
          {#if adminEditorPath}
            <span class="h-6 w-px bg-border" aria-hidden="true"></span>
            <a
              href={resolve(adminEditorPath as `/${string}`)}
              class="inline-flex h-6 w-6 items-center justify-center rounded border border-transparent transition-colors hover:border-border hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
              aria-label="Edit current page in admin"
              title="Edit current page in admin"
            >
              <svg
                class="size-3.5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                aria-hidden="true"
              >
                <path d="M12 20h9" />
                <path d="M16.5 3.5a2.12 2.12 0 113 3L7 19l-4 1 1-4z" />
              </svg>
            </a>
          {/if}
        </div>
      {:else}
        <div class="flex items-center justify-end gap-2">
          {#if siteSettings?.allow_transition_toggle}
            <label for="transition" class="text-xs tracking-widest uppercase"
              >Motion</label
            >
            <select
              id="transition"
              class="rounded border border-border-strong bg-transparent px-2 py-1 text-xs"
              bind:value={transitionPreset}
              onchange={(event) =>
                updateTransitionPreset(
                  (event.currentTarget as HTMLSelectElement)
                    .value as typeof transitionPreset,
                )}
            >
              <option value="cinematic">Cinematic</option>
              <option value="snappy">Snappy</option>
              <option value="experimental">Experimental</option>
            </select>
          {/if}
          {#if publicSveditEditable}
            <button
              type="button"
              class="inline-flex h-6 w-6 items-center justify-center rounded border border-transparent transition-colors hover:border-border hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
              aria-label={publicEditModeEnabled
                ? 'Exit public edit mode'
                : 'Enter public edit mode'}
              title={publicEditModeEnabled
                ? 'Exit public edit mode'
                : 'Enter public edit mode'}
              onclick={() => setPublicEditMode(!publicEditModeEnabled)}
            >
              <svg
                class="size-3.5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                aria-hidden="true"
              >
                {#if publicEditModeEnabled}
                  <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6z" />
                  <circle cx="12" cy="12" r="3" />
                {:else}
                  <path d="M12 20h9" />
                  <path d="M16.5 3.5a2.12 2.12 0 113 3L7 19l-4 1 1-4z" />
                {/if}
              </svg>
            </button>
            {#if publicEditModeEnabled}
              <button
                type="submit"
                form="public-svedit-form"
                class="inline-flex h-6 w-6 items-center justify-center rounded border border-transparent transition-colors hover:border-border hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
                aria-label="Save public page changes"
                title="Save public page changes"
              >
                <svg
                  class="size-3.5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  aria-hidden="true"
                >
                  <path
                    d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"
                  />
                  <path d="M17 21v-8H7v8" />
                  <path d="M7 3v5h8" />
                </svg>
              </button>
            {/if}
          {/if}
          {#if adminPublicPath}
            {#if siteSettings?.allow_transition_toggle}
              <span class="h-6 w-px bg-border" aria-hidden="true"></span>
            {/if}
            <a
              href={resolve(adminPublicPath as `/${string}`)}
              class="inline-flex h-6 w-6 items-center justify-center rounded border border-transparent transition-colors hover:border-border hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
              aria-label="View public page"
              title="View public page"
            >
              <svg
                class="size-3.5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                aria-hidden="true"
              >
                <path
                  d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"
                />
                <path d="M14 2v6h6" />
                <path d="M8 13h8" />
                <path d="M8 17h8" />
              </svg>
            </a>
          {/if}
          {#if adminEditorPath}
            {#if siteSettings?.allow_transition_toggle || publicSveditEditable}
              <span class="h-6 w-px bg-border" aria-hidden="true"></span>
            {/if}
            <a
              href={resolve(adminEditorPath as `/${string}`)}
              class="inline-flex h-6 w-6 items-center justify-center rounded border border-transparent transition-colors hover:border-border hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
              aria-label="Edit current page in admin"
              title="Edit current page in admin"
            >
              <svg
                class="size-3.5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                aria-hidden="true"
              >
                <path d="M12 20h9" />
                <path d="M16.5 3.5a2.12 2.12 0 113 3L7 19l-4 1 1-4z" />
              </svg>
            </a>
          {/if}
        </div>
      {/if}
    </div>
  </header>

  <main
    class="site-main pt-[var(--site-header-height)] md:pt-0"
    data-mobile-menu-root
  >
    {@render children()}
  </main>
</div>

<style>
  :global(.site-main) {
    view-transition-name: page-main;
  }

  :global(html) {
    --site-header-height: var(--size-header);
    --vt-duration: 450ms;
    --vt-ease: cubic-bezier(0.22, 1, 0.36, 1);
  }

  :global(html[data-vt-preset='cinematic']) {
    --vt-duration: 560ms;
    --vt-ease: cubic-bezier(0.16, 1, 0.3, 1);
  }

  :global(html[data-vt-preset='snappy']) {
    --vt-duration: 240ms;
    --vt-ease: cubic-bezier(0.32, 0.72, 0, 1);
  }

  :global(html[data-vt-preset='experimental']) {
    --vt-duration: 720ms;
    --vt-ease: cubic-bezier(0.22, 1, 0.36, 1);
  }

  :global(html[data-vt-reduced='1']) {
    --vt-duration: 140ms;
    --vt-ease: linear;
  }

  /* Let clicks pass through the transition overlay so nav and links work on first click */
  :global(::view-transition),
  :global(::view-transition-group(*)),
  :global(::view-transition-image-pair(*)),
  :global(::view-transition-old(*)),
  :global(::view-transition-new(*)) {
    pointer-events: none;
  }

  :global(::view-transition-old(root)),
  :global(::view-transition-new(root)) {
    animation: none;
  }

  :global(::view-transition-old(page-main)),
  :global(::view-transition-new(page-main)) {
    animation-duration: var(--vt-duration);
    animation-timing-function: var(--vt-ease);
    animation-fill-mode: both;
  }

  :global(::view-transition-group(*)),
  :global(::view-transition-old(*)),
  :global(::view-transition-new(*)) {
    animation-duration: var(--vt-duration);
    animation-timing-function: var(--vt-ease);
  }

  :global(::view-transition-old(page-main)) {
    animation-name: vt-fade-out;
  }

  :global(::view-transition-new(page-main)) {
    animation-name: vt-fade-in;
  }

  :global(html[data-vt-reduced='1']::view-transition-old(page-main)) {
    animation-name: vt-fade-out;
  }

  :global(html[data-vt-reduced='1']::view-transition-new(page-main)) {
    animation-name: vt-fade-in;
  }

  @keyframes vt-fade-in {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }

  @keyframes vt-fade-out {
    from {
      opacity: 1;
    }
    to {
      opacity: 0;
    }
  }
</style>
