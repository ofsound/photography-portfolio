<script lang="ts">
  import { goto } from '$app/navigation';
  import { resolve } from '$app/paths';
  import { page } from '$app/state';

  import MobileDropdownMenu from '$lib/components/navigation/MobileDropdownMenu.svelte';

  import {
    setGalleryTransitionContext,
    type GalleryTransitionPhase,
  } from '$lib/context/gallery-transition';
  import { createBrandStyles } from '$lib/stores/useBrandStyles.svelte';
  import { createConversionPoller } from '$lib/stores/useConversionPoller.svelte';
  import { createSiteHeader } from '$lib/stores/useSiteHeader.svelte';
  import { createThemeManager } from '$lib/stores/useTheme.svelte';
  import { createViewTransitions } from '$lib/stores/useViewTransitions.svelte';
  import {
    computeAdminPublicPath,
    resolveAdminEditorPath,
  } from '$lib/utils/admin-public-paths';
  import {
    buildGalleryPath,
    isGalleryDetailPath,
  } from '$lib/utils/gallery-routes';
  import { MEDIA_BELOW_MD } from '$lib/constants/breakpoints';

  import type { LayoutData } from './$types';

  import '../app.css';

  const { data, children } = $props<{
    data: LayoutData | null;
    children: import('svelte').Snippet;
  }>();

  // --- Route helpers ---

  const isAdminPath = (pathname: string) =>
    pathname === '/admin' || pathname.startsWith('/admin/');

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

  // --- Gallery transition context ---

  let phase = $state<GalleryTransitionPhase>(
    isGalleryDetailPath(page.url.pathname) ? 'open' : 'idle',
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

  // --- Nav data ---

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

  // --- Settings ---

  const globalSiteSettings = $derived(data?.siteSettings ?? null);
  const viewerGallerySettings = $derived(
    ((page.data as Record<string, unknown> | null)?.gallerySettings ??
      null) as {
      theme_default?: 'light' | 'dark' | 'system' | null;
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

  // --- Extracted modules ---

  const theme = createThemeManager({
    getGlobalSiteSettings: () => globalSiteSettings,
    getViewerGallerySettings: () => viewerGallerySettings,
    isViewerRoute,
  });

  const brand = createBrandStyles(() => siteSettings);

  const header = createSiteHeader();

  createConversionPoller(
    () => Boolean(data?.session),
    () => (data?.pendingConversionCount as number) ?? 0,
  );

  createViewTransitions(isViewerRoute);

  // --- Mobile detection ---

  let isMobile = $state(false);
  $effect(() => {
    const media = window.matchMedia(MEDIA_BELOW_MD);
    isMobile = media.matches;
    const listener = (e: MediaQueryListEvent) => (isMobile = e.matches);
    media.addEventListener('change', listener);
    return () => media.removeEventListener('change', listener);
  });

  // --- Route-derived state ---

  const isViewer = $derived(isViewerRoute(page.url.pathname));
  const isHomePage = $derived(page.url.pathname === '/');
  const isAdminRoute = $derived(isAdminPath(page.url.pathname));
  const cmsRole = $derived(
    ((data as Record<string, unknown> | null)?.cmsRole ?? null) as
      | 'admin'
      | 'editor'
      | null,
  );
  const canAccessPublicEditor = $derived(
    cmsRole === 'admin' || cmsRole === 'editor',
  );

  // --- Public edit mode ---

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

  let publicMobileMenuOpen = $state(false);

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

  // --- Admin/public path switching ---

  const adminEditorPath = $derived.by(() => {
    if (!canAccessPublicEditor) return null;
    return resolveAdminEditorPath(page.url.pathname, allGallerySlugs);
  });

  const adminPublicPath = $derived.by(() => {
    if (!isAdminRoute) return null;
    return computeAdminPublicPath(page.url.pathname, currentRouteData);
  });

  // --- Header classes ---

  const desktopHeaderClass = $derived.by(() => {
    const base =
      'sticky top-0 z-40 hidden border-b px-4 text-text transition-opacity duration-(--duration-chrome) ease-out md:block';
    if (isHomePage) {
      return `${base} border-transparent bg-transparent`;
    }
    return `${base} border-border bg-surface`;
  });
  const mainClass = $derived.by(() => {
    if (isAdminRoute) {
      return 'relative z-0 h-[100dvh] overflow-hidden md:h-[calc(100dvh-var(--site-header-height))]';
    }
    const base = 'relative z-0 min-h-screen';
    if (isHomePage) {
      return `${base} pt-0 lg:min-h-[calc(100vh-var(--site-header-height))] lg:pt-0`;
    }
    return `${base} pt-[var(--site-header-height)] lg:min-h-[calc(100vh-var(--site-header-height))] lg:pt-0`;
  });
</script>

<svelte:head>
  <script
    data-brand-light={brand.brandLightHex}
    data-brand-dark={brand.brandDarkHex}
    data-brand-contrast-light={brand.brandContrastLightHex}
    data-brand-contrast-dark={brand.brandContrastDarkHex}
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
  <meta name="site-theme-default" content={theme.siteThemeDefault} />
  <meta name="site-font-public-family" content={brand.publicFontFamily} />
  <meta name="site-font-admin-family" content={brand.adminFontFamily} />
  {#each brand.fontImportUrls as fontImportUrl (fontImportUrl)}
    <link rel="stylesheet" href={fontImportUrl} />
  {/each}
</svelte:head>

<div class="min-h-screen bg-bg text-text">
  <header
    class="fixed inset-x-0 top-0 z-[60] border-b px-4 pt-[env(safe-area-inset-top)] text-text transition-opacity duration-(--duration-chrome) ease-out md:hidden"
    class:bg-surface={!isHomePage}
    class:border-border={!isHomePage}
    class:bg-transparent={isHomePage}
    class:border-transparent={isHomePage}
    class:hidden={isAdminRoute}
    class:opacity-0={chromeHidden}
    data-theme={isMobile && isHomePage ? 'light' : undefined}
  >
    <div
      class="mx-auto flex h-[var(--size-mobile-header)] w-full items-center justify-between gap-3"
    >
      <a
        href={resolve('/')}
        class="hidden text-2xl tracking-[0.22em] uppercase"
        aria-label="Go to Home"
      >
        Home
      </a>

      <div class="ml-auto flex items-center justify-end gap-2">
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
              class="size-4.5 overflow-visible"
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
                <path d="M16.5 3.5a2.12 2.12 0 113 3L7 19l-4 1 1-4z" />
                <text
                  x="13.5"
                  y="20.5"
                  font-size="9"
                  font-family="sans-serif"
                  font-weight="bold"
                  fill="currentColor"
                  stroke="none">SV</text
                >
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
                class="border-t border-border py-4 text-xl">{navPage.title}</a
              >
            {/each}
            {#if showSearchLinkInNav}
              <a
                href={resolve('/search')}
                class="border-t border-border py-4 text-xl">Search</a
              >
            {/if}
          </nav>
        </MobileDropdownMenu>
      </div>
    </div>
  </header>

  <header
    bind:this={header.el}
    class={desktopHeaderClass}
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
      </nav>

      {#if isViewer}
        {#if adminEditorPath}
          <div class="ml-4 flex items-center justify-end">
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
          </div>
        {/if}
      {:else}
        <div class="flex items-center justify-end gap-2">
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
                class="size-3.5 overflow-visible"
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
                  <path d="M16.5 3.5a2.12 2.12 0 113 3L7 19l-4 1 1-4z" />
                  <text
                    x="13.5"
                    y="20.5"
                    font-size="9"
                    font-family="sans-serif"
                    font-weight="bold"
                    fill="currentColor"
                    stroke="none">SV</text
                  >
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
            {#if publicSveditEditable}
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

  <main class={mainClass}>
    {@render children()}
  </main>
</div>

<style>
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
