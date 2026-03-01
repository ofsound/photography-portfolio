<script lang="ts">
  import "../app.css";
  import {goto, invalidateAll, onNavigate} from "$app/navigation";
  import {page} from "$app/state";
  import {setGalleryTransitionContext} from "$lib/context/gallery-transition";
  import {getGalleryPrefs, galleryDensityStore, setGalleryPrefs} from "$lib/stores/gallery-prefs";
  import type {LayoutData} from "./$types";

  let {data, children} = $props<{data: LayoutData | null; children: import("svelte").Snippet}>();

  const isDetailRoute = (pathname: string) => /^\/photo\/[^/]+(?:\/[^/]+)?$/.test(pathname);

  let phase = $state<import("$lib/context/gallery-transition").GalleryTransitionPhase>(
    isDetailRoute(page.url.pathname) ? "open" : "idle"
  );
  setGalleryTransitionContext(
    () => phase,
    (p) => {
      phase = p;
    },
  );
  const chromeHidden = $derived(phase === "fade-out-chrome" || phase === "scale-and-mask" || phase === "open" || phase === "closing-chrome" || phase === "closing-scale");
  const navPages = $derived((data?.navPages ?? []) as Array<{id: string; slug: string; title: string; nav_order: number}>);
  const siteSettings = $derived(data?.siteSettings ?? null);
  const hasSession = $derived(Boolean(data?.session));
  const pendingConversionCount = $derived((data?.pendingConversionCount as number) ?? 0);
  const maxDensity = $derived(siteSettings?.grid_desktop_max ?? 20);
  let themeMode = $state<"light" | "dark" | "system">("system");
  let transitionPreset = $state<"cinematic" | "snappy" | "experimental">("cinematic");
  let hasHydratedClientPrefs = $state(false);
  let siteHeaderEl: HTMLElement | null = null;
  let galleryQueryInput = $state("");

  const isGalleryRoute = (pathname: string) => pathname === "/gallery" || pathname.startsWith("/gallery/");
  const isViewerRoute = (pathname: string) => isGalleryRoute(pathname) || isDetailRoute(pathname);
  const isViewer = $derived(isViewerRoute(page.url.pathname));

  $effect(() => {
    if (!isViewerRoute(page.url.pathname)) return;
    const q = page.url.searchParams.get("q") ?? "";
    galleryQueryInput = q;
  });

  const onGallerySearchSubmit = (event: SubmitEvent) => {
    event.preventDefault();
    const q = galleryQueryInput.trim();
    goto(q ? `/gallery?q=${encodeURIComponent(q)}` : "/gallery", {replaceState: true, noScroll: true, keepFocus: true});
  };

  $effect(() => {
    if (typeof window === "undefined" || !isViewer) return;
    const prefs = getGalleryPrefs(maxDensity);
    if (prefs) galleryDensityStore.set(prefs.density);
  });

  const updateHeaderDensity = (next: number) => {
    const n = Math.max(1, Math.min(maxDensity, Math.round(next)));
    setGalleryPrefs({density: n}, maxDensity);
  };

  const applyTransitionPreset = () => {
    document.documentElement.dataset.vtPreset = transitionPreset;
  };

  const clearTransitionMeta = () => {
    delete document.documentElement.dataset.vt;
    delete document.documentElement.dataset.vtDirection;
    delete document.documentElement.dataset.vtReduced;
  };

  const applyTheme = (mode: "light" | "dark" | "system") => {
    const isDarkSystem = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const active = mode === "system" ? (isDarkSystem ? "dark" : "light") : mode;
    document.documentElement.dataset.theme = active;
  };

  const updateTransitionPreset = (preset: "cinematic" | "snappy" | "experimental") => {
    transitionPreset = preset;
    if (siteSettings?.allow_transition_toggle) {
      localStorage.setItem("transition-preset", preset);
    }
    applyTransitionPreset();
  };

  const syncSiteHeaderHeight = () => {
    if (typeof document === "undefined" || !siteHeaderEl) return;
    document.documentElement.style.setProperty("--site-header-height", `${siteHeaderEl.getBoundingClientRect().height}px`);
  };

  $effect(() => {
    if (typeof window === "undefined" || hasHydratedClientPrefs) return;

    themeMode = siteSettings?.theme_default ?? "system";
    transitionPreset = siteSettings?.transition_preset ?? "cinematic";

    const storedTheme = localStorage.getItem("theme-mode");
    if (storedTheme === "light" || storedTheme === "dark" || storedTheme === "system") {
      themeMode = storedTheme;
    }

    if (siteSettings?.allow_transition_toggle) {
      const storedPreset = localStorage.getItem("transition-preset");
      if (storedPreset === "cinematic" || storedPreset === "snappy" || storedPreset === "experimental") {
        transitionPreset = storedPreset;
      }
    } else {
      localStorage.removeItem("transition-preset");
    }

    applyTransitionPreset();
    applyTheme(themeMode);
    hasHydratedClientPrefs = true;
  });

  $effect(() => {
    if (typeof window === "undefined") return;
    if (!hasSession || pendingConversionCount <= 0) return;

    const timer = setInterval(() => {
      invalidateAll();
    }, 8000);

    return () => clearInterval(timer);
  });

  $effect(() => {
    if (typeof window === "undefined") return;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const listener = () => {
      if (themeMode === "system") {
        applyTheme("system");
      }
    };

    media.addEventListener("change", listener);
    return () => media.removeEventListener("change", listener);
  });

  $effect(() => {
    if (typeof document === "undefined") return;
    if (!siteSettings?.allow_transition_toggle) {
      transitionPreset = siteSettings?.transition_preset ?? transitionPreset;
    }
    applyTransitionPreset();
  });

  $effect(() => {
    if (typeof window === "undefined" || !siteHeaderEl) return;
    syncSiteHeaderHeight();
    const observer = new ResizeObserver(syncSiteHeaderHeight);
    observer.observe(siteHeaderEl);
    window.addEventListener("resize", syncSiteHeaderHeight);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", syncSiteHeaderHeight);
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

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    document.documentElement.dataset.vt = "default";
    delete document.documentElement.dataset.vtDirection;
    if (reducedMotion) {
      document.documentElement.dataset.vtReduced = "1";
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
  <header bind:this={siteHeaderEl} class="chrome-panel sticky top-0 z-40 border-b border-border px-4 py-3 transition-opacity duration-[var(--duration-chrome)] ease-out" class:opacity-0={chromeHidden}>
    <div class="mx-auto flex w-full items-center justify-between gap-3">
      <nav class="flex items-center gap-4 text-sm tracking-[var(--tracking-nav)] uppercase">
        <a href="/" >Home</a>
        <a href="/gallery">Gallery</a>
        {#each navPages as navPage (navPage.id)}
          <a href={`/${navPage.slug}`}>{navPage.title}</a>
        {/each}
        {#if hasSession}
          <a href="/admin/photos" >Admin</a>
        {/if}
      </nav>

      <div class="flex items-center justify-end gap-3">
        {#if isViewer}
          <div class="flex items-center gap-2 text-xs uppercase tracking-[var(--tracking-heading)]" role="group" aria-label="Items per row">
            <span>Zoom</span>
            <div class="flex items-center gap-1">
              <input
                type="number"
                min="1"
                max={maxDensity}
                value={$galleryDensityStore}
                class="w-8 rounded border border-border-strong bg-transparent py-0.5 text-center tabular-nums [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                aria-label="Items per row"
                oninput={(e) => {
                  const v = Number((e.currentTarget as HTMLInputElement).value);
                  if (!Number.isNaN(v)) updateHeaderDensity(v);
                }}
                onchange={(e) => {
                  const el = e.currentTarget as HTMLInputElement;
                  let v = Number(el.value);
                  if (Number.isNaN(v) || v < 1) v = 1;
                  if (v > maxDensity) v = maxDensity;
                  el.value = String(v);
                  updateHeaderDensity(v);
                }}
              />
              <div class="flex flex-col">
                <button
                  type="button"
                  class="flex h-[50%] min-h-5 w-6 items-center justify-center hover:bg-border/50 disabled:opacity-40"
                  aria-label="Increase items per row"
                  disabled={$galleryDensityStore >= maxDensity}
                  onclick={() => updateHeaderDensity($galleryDensityStore + 1)}
                >
                  <svg class="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7" />
                  </svg>
                </button>
                <button
                  type="button"
                  class="flex h-[50%] min-h-5 w-6 items-center justify-center hover:bg-border/50 disabled:opacity-40"
                  aria-label="Decrease items per row"
                  disabled={$galleryDensityStore <= 1}
                  onclick={() => updateHeaderDensity($galleryDensityStore - 1)}
                >
                  <svg class="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
          <form class="flex w-full max-w-[200px] items-center gap-2" onsubmit={onGallerySearchSubmit}>
            <input
              name="q"
              bind:value={galleryQueryInput}
              placeholder="Search"
              aria-label="Search title, description, tags, category"
              class="w-full rounded border border-border bg-transparent px-2 py-1 text-xs"
            />
            <button class="flex shrink-0 items-center justify-center rounded border border-border-strong p-1.5 transition-colors hover:bg-surface-muted" type="submit" aria-label="Search">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>
              </svg>
            </button>
          </form>
        {:else}
          {#if siteSettings?.allow_transition_toggle}
            <label for="transition" class="text-xs uppercase tracking-[var(--tracking-tight)]">Motion</label>
            <select id="transition" class="rounded border border-border-strong bg-transparent px-2 py-1 text-xs" bind:value={transitionPreset} onchange={(event) => updateTransitionPreset((event.currentTarget as HTMLSelectElement).value as typeof transitionPreset)}>
              <option value="cinematic">Cinematic</option>
              <option value="snappy">Snappy</option>
              <option value="experimental">Experimental</option>
            </select>
          {/if}
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

  :global(html[data-vt-preset="cinematic"]) {
    --vt-duration: 560ms;
    --vt-ease: cubic-bezier(0.16, 1, 0.3, 1);
  }

  :global(html[data-vt-preset="snappy"]) {
    --vt-duration: 240ms;
    --vt-ease: cubic-bezier(0.32, 0.72, 0, 1);
  }

  :global(html[data-vt-preset="experimental"]) {
    --vt-duration: 720ms;
    --vt-ease: cubic-bezier(0.22, 1, 0.36, 1);
  }

  :global(html[data-vt-reduced="1"]) {
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

  :global(html[data-vt-reduced="1"]::view-transition-old(page-main)) {
    animation-name: vt-fade-out;
  }

  :global(html[data-vt-reduced="1"]::view-transition-new(page-main)) {
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
