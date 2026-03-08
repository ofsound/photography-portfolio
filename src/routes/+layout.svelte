<script lang="ts">
  import '../app.css';
  import { invalidateAll, onNavigate } from '$app/navigation';
  import { resolve } from '$app/paths';
  import { page } from '$app/state';
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
    isGalleryDetailPath,
  } from '$lib/utils/gallery-routes';
  import ZoomControl from '$lib/components/ZoomControl.svelte';
  import type { LayoutData } from './$types';

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
  const gallerySettings = $derived(
    ((data as Record<string, unknown> | null)?.gallerySettings ?? null) as {
      theme_default?: 'light' | 'dark' | 'system' | null;
      transition_preset?: 'cinematic' | 'snappy' | 'experimental' | null;
      allow_transition_toggle?: boolean | null;
      show_search_bar?: boolean | null;
    } | null,
  );
  const siteSettings = $derived(
    isViewerRoute(page.url.pathname) && gallerySettings
      ? {
          ...globalSiteSettings,
          ...gallerySettings,
        }
      : globalSiteSettings,
  );
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

  const isViewer = $derived(isViewerRoute(page.url.pathname));

  $effect(() => {
    if (typeof window === 'undefined' || !isViewer) return;
    const prefs = getGalleryPrefs(maxDensity);
    if (prefs) {
      galleryDensityStore.set(prefs.density);
      if (prefs.layoutMode) layoutModeStore.set(prefs.layoutMode);
    }
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
    if (typeof document === 'undefined' || !siteHeaderEl) return;
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
    if (typeof window === 'undefined' || !siteHeaderEl) return;
    syncSiteHeaderHeight();
    const observer = new ResizeObserver(syncSiteHeaderHeight);
    observer.observe(siteHeaderEl);
    window.addEventListener('resize', syncSiteHeaderHeight);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', syncSiteHeaderHeight);
    };
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
  <meta name="site-theme-default" content={siteThemeDefault} />
</svelte:head>

<div class="min-h-screen bg-bg text-text">
  <header
    bind:this={siteHeaderEl}
    class="chrome-panel sticky top-0 z-40 border-b border-border px-4 transition-opacity duration-(--duration-chrome) ease-out"
    class:opacity-0={chromeHidden}
  >
    <div class="mx-auto flex w-full items-center justify-between gap-3">
      <nav
        class="flex items-center gap-6 py-3 text-sm tracking-widest uppercase"
      >
        <a href={resolve('/')}>Home</a>
        <a href={resolve('/search')}>Search</a>
        {#each navGalleries as navGallery (navGallery.id)}
          <a href={resolve(buildGalleryPath(navGallery.slug) as `/${string}`)}
            >{navGallery.name}</a
          >
        {/each}
        {#each navPages as navPage (navPage.id)}
          <a href={resolve(`/${navPage.slug}`)}>{navPage.title}</a>
        {/each}
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
        </div>
      {/if}
    </div>
  </header>

  <main class="site-main">{@render children()}</main>
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
