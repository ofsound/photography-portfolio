<script lang="ts">
  import '../app.css';
  import { invalidateAll, onNavigate } from '$app/navigation';
  import { page } from '$app/state';
  import { setGalleryTransitionContext } from '$lib/context/gallery-transition';
  import type { LayoutData } from './$types';

  let { data, children } = $props<{ data: LayoutData | null; children: import('svelte').Snippet }>();

  const { phase } = setGalleryTransitionContext();
  const chromeHidden = $derived(
    phase === 'fade-out-chrome' ||
      phase === 'scale-and-mask' ||
      phase === 'open' ||
      phase === 'closing-chrome' ||
      phase === 'closing-scale'
  );
  const navPages = $derived((data?.navPages ?? []) as Array<{ id: string; slug: string; title: string; nav_order: number }>);
  const siteSettings = $derived(data?.siteSettings ?? null);
  const hasSession = $derived(Boolean(data?.session));
  const pendingConversionCount = $derived((data?.pendingConversionCount as number) ?? 0);
  let themeMode = $state<'light' | 'dark' | 'system'>('system');
  let transitionPreset = $state<'cinematic' | 'snappy' | 'experimental'>('cinematic');
  let hasHydratedClientPrefs = $state(false);
  let siteHeaderEl: HTMLElement | null = null;

  const isGalleryRoute = (pathname: string) => pathname === '/gallery' || pathname.startsWith('/gallery/');
  const isDetailRoute = (pathname: string) => /^\/photo\/[^/]+(?:\/[^/]+)?$/.test(pathname);
  const isViewerRoute = (pathname: string) => isGalleryRoute(pathname) || isDetailRoute(pathname);

  const applyTransitionPreset = () => {
    document.documentElement.dataset.vtPreset = transitionPreset;
  };

  const clearTransitionMeta = () => {
    delete document.documentElement.dataset.vt;
    delete document.documentElement.dataset.vtDirection;
    delete document.documentElement.dataset.vtReduced;
  };

  const applyTheme = (mode: 'light' | 'dark' | 'system') => {
    const isDarkSystem = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const active = mode === 'system' ? (isDarkSystem ? 'dark' : 'light') : mode;
    document.documentElement.dataset.theme = active;
  };

  const updateTheme = (mode: 'light' | 'dark' | 'system') => {
    themeMode = mode;
    localStorage.setItem('theme-mode', mode);
    applyTheme(mode);
  };

  const updateTransitionPreset = (preset: 'cinematic' | 'snappy' | 'experimental') => {
    transitionPreset = preset;
    if (siteSettings?.allow_transition_toggle) {
      localStorage.setItem('transition-preset', preset);
    }
    applyTransitionPreset();
  };

  const syncSiteHeaderHeight = () => {
    if (typeof document === 'undefined' || !siteHeaderEl) return;
    document.documentElement.style.setProperty('--site-header-height', `${siteHeaderEl.getBoundingClientRect().height}px`);
  };

  $effect(() => {
    if (typeof window === 'undefined' || hasHydratedClientPrefs) return;

    themeMode = siteSettings?.theme_default ?? 'system';
    transitionPreset = siteSettings?.transition_preset ?? 'cinematic';

    const storedTheme = localStorage.getItem('theme-mode');
    if (storedTheme === 'light' || storedTheme === 'dark' || storedTheme === 'system') {
      themeMode = storedTheme;
    }

    if (siteSettings?.allow_transition_toggle) {
      const storedPreset = localStorage.getItem('transition-preset');
      if (storedPreset === 'cinematic' || storedPreset === 'snappy' || storedPreset === 'experimental') {
        transitionPreset = storedPreset;
      }
    } else {
      localStorage.removeItem('transition-preset');
    }

    applyTransitionPreset();
    applyTheme(themeMode);
    hasHydratedClientPrefs = true;
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
      if (themeMode === 'system') {
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

    if (!document.startViewTransition) {
      return;
    }

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

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
        await navigation.complete;
      });

      transition.finished.finally(() => {
        clearTransitionMeta();
      });
    });
  });
</script>

<div class="min-h-screen bg-bg text-text">
  <header
    bind:this={siteHeaderEl}
    class="chrome-panel sticky top-0 z-40 border-b border-border px-4 py-3 transition-opacity duration-[var(--duration-chrome)] ease-out"
    class:opacity-0={chromeHidden}
  >
    <div class="mx-auto flex w-full max-w-[var(--max-width-site)] items-center justify-between gap-3">
      <nav class="flex items-center gap-4 text-sm tracking-[var(--tracking-nav)] uppercase">
        <a href="/" class:underline={page.url.pathname === '/'}>Home</a>
        <a href="/gallery" class:underline={page.url.pathname.startsWith('/gallery')}>Gallery</a>
        {#each navPages as navPage (navPage.id)}
          <a href={`/${navPage.slug}`} class:underline={page.url.pathname === `/${navPage.slug}`}>{navPage.title}</a>
        {/each}
        {#if hasSession}
          <a href="/admin/photos" class:underline={page.url.pathname.startsWith('/admin')}>Admin</a>
          <span class="rounded border border-border px-2 py-1 text-xs uppercase tracking-[var(--tracking-tight)]"
            >PENDING CONVERSIONS: {pendingConversionCount}</span
          >
        {/if}
      </nav>

      <div class="flex items-center gap-2">
        <label for="theme" class="text-xs uppercase tracking-[var(--tracking-tight)]">Theme</label>
        <select
          id="theme"
          class="rounded border border-border-strong bg-transparent px-2 py-1 text-xs"
          bind:value={themeMode}
          onchange={(event) => updateTheme((event.currentTarget as HTMLSelectElement).value as typeof themeMode)}
        >
          <option value="light">Light</option>
          <option value="dark">Dark</option>
          <option value="system">System</option>
        </select>

        {#if siteSettings?.allow_transition_toggle}
          <label for="transition" class="ml-2 text-xs uppercase tracking-[var(--tracking-tight)]">Motion</label>
          <select
            id="transition"
            class="rounded border border-border-strong bg-transparent px-2 py-1 text-xs"
            bind:value={transitionPreset}
            onchange={(event) =>
              updateTransitionPreset((event.currentTarget as HTMLSelectElement).value as typeof transitionPreset)}
          >
            <option value="cinematic">Cinematic</option>
            <option value="snappy">Snappy</option>
            <option value="experimental">Experimental</option>
          </select>
        {/if}
      </div>
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
  :global(::view-transition) {
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
