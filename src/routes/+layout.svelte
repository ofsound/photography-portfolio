<script lang="ts">
  import '../app.css';
  import { onNavigate } from '$app/navigation';
  import { page } from '$app/stores';
  import { onMount } from 'svelte';
  import { readAndClearViewTransitionHint } from '$lib/utils/view-transition';

  let { data, children } = $props();
  let themeMode = $state<'light' | 'dark' | 'system'>('system');
  let transitionPreset = $state<'cinematic' | 'snappy' | 'experimental'>('cinematic');

  const isGalleryRoute = (pathname: string) => pathname === '/gallery' || pathname.startsWith('/gallery/');
  const isDetailRoute = (pathname: string) => /^\/photo\/[^/]+(?:\/[^/]+)?$/.test(pathname);

  const applyTransitionPreset = () => {
    document.documentElement.dataset.vtPreset = transitionPreset;
  };

  const clearTransitionMeta = () => {
    delete document.documentElement.dataset.vt;
    delete document.documentElement.dataset.vtDirection;
    delete document.documentElement.dataset.vtReduced;
  };

  const resolveTransitionMeta = (fromPath: string, toPath: string) => {
    const hint = readAndClearViewTransitionHint();
    let kind: 'default' | 'gallery-to-detail' | 'detail-to-gallery' | 'detail-to-detail' = 'default';
    let direction: 'next' | 'prev' | null = null;

    if (isGalleryRoute(fromPath) && isDetailRoute(toPath)) {
      kind = 'gallery-to-detail';
    } else if (isDetailRoute(fromPath) && isGalleryRoute(toPath)) {
      kind = 'detail-to-gallery';
    } else if (isDetailRoute(fromPath) && isDetailRoute(toPath)) {
      kind = 'detail-to-detail';
    } else if (hint?.kind) {
      kind = hint.kind;
    }

    if (kind === 'detail-to-detail' && hint?.direction) {
      direction = hint.direction;
    }

    return { kind, direction };
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
    if (data.siteSettings?.allow_transition_toggle) {
      localStorage.setItem('transition-preset', preset);
    }
    applyTransitionPreset();
  };

  onMount(() => {
    themeMode = data.siteSettings?.theme_default ?? 'system';
    transitionPreset = data.siteSettings?.transition_preset ?? 'cinematic';

    const stored = localStorage.getItem('theme-mode') as 'light' | 'dark' | 'system' | null;
    if (stored) {
      themeMode = stored;
    }

    if (data.siteSettings?.allow_transition_toggle) {
      const storedPreset = localStorage.getItem('transition-preset') as 'cinematic' | 'snappy' | 'experimental' | null;
      if (storedPreset === 'cinematic' || storedPreset === 'snappy' || storedPreset === 'experimental') {
        transitionPreset = storedPreset;
      }
    } else {
      localStorage.removeItem('transition-preset');
    }

    applyTransitionPreset();
    applyTheme(themeMode);

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
    if (!data.siteSettings?.allow_transition_toggle) {
      transitionPreset = data.siteSettings?.transition_preset ?? transitionPreset;
    }
    applyTransitionPreset();
  });

  onNavigate((navigation) => {
    const fromPath = navigation.from?.url.pathname ?? window.location.pathname;
    const toPath = navigation.to?.url.pathname ?? fromPath;
    const meta = resolveTransitionMeta(fromPath, toPath);

    if (!document.startViewTransition) {
      return;
    }

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    document.documentElement.dataset.vt = meta.kind;
    if (meta.direction) {
      document.documentElement.dataset.vtDirection = meta.direction;
    } else {
      delete document.documentElement.dataset.vtDirection;
    }
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

<div class="min-h-screen bg-paper text-ink">
  <header class="chrome-panel sticky top-0 z-40 border-b border-black/10 px-4 py-3 dark:border-white/10">
    <div class="mx-auto flex w-full max-w-[1800px] items-center justify-between gap-3">
      <nav class="flex items-center gap-4 text-sm tracking-[0.16em] uppercase">
        <a href="/" class:underline={$page.url.pathname === '/'}>Home</a>
        <a href="/gallery" class:underline={$page.url.pathname.startsWith('/gallery')}>Gallery</a>
        <a href="/about" class:underline={$page.url.pathname === '/about'}>About</a>
        <a href="/contact" class:underline={$page.url.pathname === '/contact'}>Contact</a>
        <a href={data.session ? '/admin' : '/auth'} class:underline={$page.url.pathname.startsWith('/admin') || $page.url.pathname === '/auth'}>
          {data.session ? 'CMS' : 'Sign In'}
        </a>
      </nav>

      <div class="flex items-center gap-2">
        <label for="theme" class="text-xs uppercase tracking-[0.12em]">Theme</label>
        <select
          id="theme"
          class="rounded border border-black/20 bg-transparent px-2 py-1 text-xs"
          bind:value={themeMode}
          onchange={(event) => updateTheme((event.currentTarget as HTMLSelectElement).value as typeof themeMode)}
        >
          <option value="light">Light</option>
          <option value="dark">Dark</option>
          <option value="system">System</option>
        </select>

        {#if data.siteSettings?.allow_transition_toggle}
          <label for="transition" class="ml-2 text-xs uppercase tracking-[0.12em]">Motion</label>
          <select
            id="transition"
            class="rounded border border-black/20 bg-transparent px-2 py-1 text-xs"
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

  <main>{@render children()}</main>
</div>

<style>
  :global(html) {
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

  :global(::view-transition-old(root)),
  :global(::view-transition-new(root)) {
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

  :global(::view-transition-old(root)) {
    animation-name: vt-fade-out;
  }

  :global(::view-transition-new(root)) {
    animation-name: vt-fade-in;
  }

  :global(html[data-vt='gallery-to-detail']::view-transition-old(root)),
  :global(html[data-vt='detail-to-gallery']::view-transition-old(root)) {
    animation-name: vt-fade-out-soft;
  }

  :global(html[data-vt='gallery-to-detail']::view-transition-new(root)),
  :global(html[data-vt='detail-to-gallery']::view-transition-new(root)) {
    animation-name: vt-fade-in-soft;
  }

  :global(html[data-vt='detail-to-detail'][data-vt-direction='next']::view-transition-old(root)) {
    animation-name: vt-fade-out, vt-slide-out-next;
  }

  :global(html[data-vt='detail-to-detail'][data-vt-direction='next']::view-transition-new(root)) {
    animation-name: vt-fade-in, vt-slide-in-next;
  }

  :global(html[data-vt='detail-to-detail'][data-vt-direction='prev']::view-transition-old(root)) {
    animation-name: vt-fade-out, vt-slide-out-prev;
  }

  :global(html[data-vt='detail-to-detail'][data-vt-direction='prev']::view-transition-new(root)) {
    animation-name: vt-fade-in, vt-slide-in-prev;
  }

  :global(html[data-vt-reduced='1']::view-transition-old(root)) {
    animation-name: vt-fade-out;
  }

  :global(html[data-vt-reduced='1']::view-transition-new(root)) {
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

  @keyframes vt-fade-in-soft {
    from {
      opacity: 0;
      filter: saturate(0.92);
    }
    to {
      opacity: 1;
      filter: saturate(1);
    }
  }

  @keyframes vt-fade-out-soft {
    from {
      opacity: 1;
      filter: saturate(1);
    }
    to {
      opacity: 0;
      filter: saturate(0.92);
    }
  }

  @keyframes vt-slide-out-next {
    from {
      transform: translateX(0);
    }
    to {
      transform: translateX(-6%);
    }
  }

  @keyframes vt-slide-in-next {
    from {
      transform: translateX(6%);
    }
    to {
      transform: translateX(0);
    }
  }

  @keyframes vt-slide-out-prev {
    from {
      transform: translateX(0);
    }
    to {
      transform: translateX(6%);
    }
  }

  @keyframes vt-slide-in-prev {
    from {
      transform: translateX(-6%);
    }
    to {
      transform: translateX(0);
    }
  }
</style>
