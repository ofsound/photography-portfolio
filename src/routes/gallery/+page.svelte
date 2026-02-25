<script lang="ts">
  import { goto } from '$app/navigation';
  import { onDestroy, onMount } from 'svelte';
  import type { GalleryPhoto } from '$lib/types/content';
  import {
    clearGalleryReturnState,
    readGalleryReturnState,
    storeGalleryReturnState,
    storeViewTransitionHint
  } from '$lib/utils/view-transition';

  let { data } = $props();

  let density = $state(6);
  let layoutMode = $state<'uniform' | 'masonry'>('uniform');
  let widthMode = $state<'full' | 'constrained'>('full');
  let photos = $state<GalleryPhoto[]>([]);
  let currentPage = $state(1);
  let hasMore = $state(false);
  let isLoadingMore = $state(false);
  let loadError = $state<string | null>(null);
  let loadSentinel = $state<HTMLElement | null>(null);
  let observer: IntersectionObserver | null = null;
  let isRestoring = $state(false);
  let requestToken = 0;

  const currentGalleryUrl = () => `${window.location.pathname}${window.location.search}`;

  onMount(() => {
    density = data.density;
    layoutMode = data.layoutMode;
    widthMode = data.widthMode;
    photos = data.photos;
    currentPage = data.page;
    hasMore = data.hasMore;
    void restoreGalleryState();
  });

  const navigateGalleryWithParams = (mutate: (params: URLSearchParams) => void) => {
    const params = new URLSearchParams(data.baseQueryString);
    mutate(params);
    goto(`/gallery?${params.toString()}`, { replaceState: true, noScroll: true, keepFocus: true });
  };

  const updateDensity = (next: number) => {
    density = next;
    navigateGalleryWithParams((params) => {
      params.set('density', String(next));
    });
  };

  const updateLayoutMode = (next: 'uniform' | 'masonry') => {
    layoutMode = next;
    navigateGalleryWithParams((params) => {
      params.set('layout', next);
    });
  };

  const updateWidthMode = (next: 'full' | 'constrained') => {
    widthMode = next;
    navigateGalleryWithParams((params) => {
      params.set('width', next);
    });
  };

  const colCount = $derived(Math.max(1, Math.min(data.maxDensity ?? 20, Number(density) || 6)));
  const placeholderCount = $derived(Math.max(colCount, 6));
  const uniformRatio = $derived(Math.max(0.2, Number(data.uniformThumbRatio ?? 1)));
  const constrainedMax = $derived(data.maxContentWidthPx ?? 1600);
  const sectionMaxWidthStyle = $derived(widthMode === 'constrained' ? `max-width: min(100%, ${constrainedMax}px);` : 'max-width: 100%;');

  const onOpenPhoto = () => {
    storeGalleryReturnState({
      url: currentGalleryUrl(),
      scrollY: window.scrollY,
      loadedPage: currentPage
    });
    storeViewTransitionHint({ kind: 'gallery-to-detail' });
  };

  const loadNextPage = async (options?: { silent?: boolean }) => {
    if (isLoadingMore || !hasMore) return;

    const token = requestToken + 1;
    requestToken = token;
    isLoadingMore = true;
    if (!options?.silent) {
      loadError = null;
    }

    try {
      const params = new URLSearchParams(data.baseQueryString);
      params.set('page', String(currentPage + 1));
      params.set('pageSize', String(data.pageSize));

      const response = await fetch(`/gallery/feed?${params.toString()}`);
      if (!response.ok) {
        throw new Error('request-failed');
      }

      const payload = (await response.json()) as {
        photos: GalleryPhoto[];
        hasMore: boolean;
        page: number;
      };

      if (requestToken !== token) return;

      const existing = new Set(photos.map((photo) => photo.id));
      const nextPhotos = payload.photos.filter((photo) => !existing.has(photo.id));
      photos = [...photos, ...nextPhotos];
      currentPage = payload.page;
      hasMore = payload.hasMore;
      return true;
    } catch {
      if (requestToken !== token) return;
      if (!options?.silent) {
        loadError = 'Could not load more photos.';
      }
      return false;
    } finally {
      if (requestToken === token) {
        isLoadingMore = false;
      }
    }
  };

  const restoreGalleryState = async () => {
    const snapshot = readGalleryReturnState();
    if (!snapshot) return;
    if (snapshot.url !== currentGalleryUrl()) return;

    isRestoring = true;
    loadError = null;

    const targetPage = Math.max(1, snapshot.loadedPage || 1);
    while (currentPage < targetPage && hasMore) {
      const ok = await loadNextPage({ silent: true });
      if (!ok) break;
    }

    requestAnimationFrame(() => {
      window.scrollTo({ top: Math.max(0, snapshot.scrollY), behavior: 'auto' });
    });

    clearGalleryReturnState();
    isRestoring = false;
  };

  const teardownObserver = () => {
    if (!observer) return;
    observer.disconnect();
    observer = null;
  };

  $effect(() => {
    density = data.density;
    layoutMode = data.layoutMode;
    widthMode = data.widthMode;
    photos = data.photos;
    currentPage = data.page;
    hasMore = data.hasMore;
    loadError = null;
    requestToken += 1;
    isLoadingMore = false;
  });

  $effect(() => {
    teardownObserver();
    if (!loadSentinel || !hasMore || isRestoring) return;

    observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (!entry?.isIntersecting) return;
        void loadNextPage();
      },
      { rootMargin: '600px 0px' }
    );

    observer.observe(loadSentinel);
    return teardownObserver;
  });

  onDestroy(() => {
    teardownObserver();
  });
</script>

<section class="mx-auto w-full px-4 py-5" style={sectionMaxWidthStyle}>
  <div class="chrome-panel sticky top-[70px] z-30 mb-5 grid gap-2 rounded px-3 py-2 text-xs uppercase tracking-[0.15em] lg:grid-cols-[1fr_auto] lg:items-center">
    <form method="get" class="flex flex-1 items-center gap-2">
      <input type="hidden" name="density" value={String(colCount)} />
      <input type="hidden" name="layout" value={layoutMode} />
      <input type="hidden" name="width" value={widthMode} />
      <input type="hidden" name="pageSize" value={String(data.pageSize)} />
      <input
        name="q"
        value={data.q}
        placeholder="Search title, description, tags, category"
        class="w-full rounded border border-black/15 bg-transparent px-2 py-1"
      />
      <button class="rounded border border-black/20 px-2 py-1" type="submit">Search</button>
    </form>

    <div class="flex flex-wrap items-center justify-end gap-3">
      <label class="flex items-center gap-2">
        Density
        <input
          type="range"
          min="1"
          max={String(data.maxDensity ?? 20)}
          value={colCount}
          oninput={(e) => updateDensity(Number((e.currentTarget as HTMLInputElement).value))}
        />
        <span class="tabular-nums">{colCount}</span>
      </label>

      <div class="flex items-center gap-1">
        <button
          type="button"
          class="rounded border border-black/20 px-2 py-1 disabled:opacity-40"
          onclick={() => updateLayoutMode('uniform')}
          disabled={layoutMode === 'uniform'}
        >
          Uniform
        </button>
        <button
          type="button"
          class="rounded border border-black/20 px-2 py-1 disabled:opacity-40"
          onclick={() => updateLayoutMode('masonry')}
          disabled={layoutMode === 'masonry'}
        >
          Masonry
        </button>
      </div>

      <div class="flex items-center gap-1">
        <button
          type="button"
          class="rounded border border-black/20 px-2 py-1 disabled:opacity-40"
          onclick={() => updateWidthMode('full')}
          disabled={widthMode === 'full'}
        >
          Full
        </button>
        <button
          type="button"
          class="rounded border border-black/20 px-2 py-1 disabled:opacity-40"
          onclick={() => updateWidthMode('constrained')}
          disabled={widthMode === 'constrained'}
        >
          Constrained
        </button>
      </div>
    </div>
  </div>

  {#if photos.length === 0}
    <p class="py-16 text-center text-sm uppercase tracking-[0.14em] text-ink/70">No photos found.</p>
  {:else}
    {#if layoutMode === 'uniform'}
      <ul class="grid gap-2" style={`grid-template-columns: repeat(${colCount}, minmax(0, 1fr));`}>
        {#each photos as photo (photo.id)}
          <li>
            <a href={`/photo/${photo.slug}`} class="group relative block overflow-hidden" onclick={onOpenPhoto}>
              {#if photo.thumb}
                <img
                  src={photo.thumb}
                  alt={photo.thumbAlt}
                  class="h-full w-full object-cover transition-transform duration-500 ease-cinematic group-hover:scale-[1.03]"
                  style={`${photo.transitionName ? `view-transition-name: ${photo.transitionName};` : ''}aspect-ratio: ${uniformRatio};`}
                  loading="lazy"
                />
              {/if}
            </a>
          </li>
        {/each}

        {#if isLoadingMore}
          {#each Array.from({ length: placeholderCount }) as _, index (index)}
            <li class="animate-pulse rounded bg-black/5 dark:bg-white/10" style={`aspect-ratio: ${uniformRatio};`}></li>
          {/each}
        {/if}
      </ul>
    {:else}
      <ul class="columns-2 gap-2 md:columns-4 lg:columns-6" style={`columns: ${colCount};`}>
        {#each photos as photo (photo.id)}
          <li class="mb-2 break-inside-avoid">
            <a href={`/photo/${photo.slug}`} class="group relative block overflow-hidden" onclick={onOpenPhoto}>
              {#if photo.thumb}
                <img
                  src={photo.thumb}
                  alt={photo.thumbAlt}
                  class="h-auto w-full object-cover transition-transform duration-500 ease-cinematic group-hover:scale-[1.02]"
                  style={photo.transitionName ? `view-transition-name: ${photo.transitionName};` : undefined}
                  loading="lazy"
                />
              {/if}
            </a>
          </li>
        {/each}

        {#if isLoadingMore}
          {#each Array.from({ length: placeholderCount }) as _, index (index)}
            <li class="mb-2 break-inside-avoid animate-pulse rounded bg-black/5 dark:bg-white/10" style={`height: ${120 + (index % 5) * 34}px;`}></li>
          {/each}
        {/if}
      </ul>
    {/if}

    {#if hasMore}
      <div bind:this={loadSentinel} class="h-10 w-full"></div>
    {/if}

    {#if isLoadingMore}
      <p class="py-4 text-center text-xs uppercase tracking-[0.14em] text-ink/60">Loading more</p>
    {/if}

    {#if loadError}
      <div class="py-4 text-center text-sm">
        <p>{loadError}</p>
        <button class="mt-2 rounded border border-black/20 px-3 py-1 text-xs uppercase tracking-[0.14em]" type="button" onclick={() => void loadNextPage()}>
          Retry
        </button>
      </div>
    {/if}
  {/if}
</section>
