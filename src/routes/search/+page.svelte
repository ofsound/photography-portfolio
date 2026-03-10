<script lang="ts">
  import { pushState, replaceState } from '$app/navigation';
  import { resolve } from '$app/paths';
  import { page } from '$app/state';
  import { onDestroy, onMount } from 'svelte';

  const { data }: import('./$types').PageProps = $props();
  const DEFAULT_PAGE_MAX_WIDTH_PX = 1280;

  const toPositiveInteger = (value: unknown) => {
    const parsed = Math.round(Number(value));
    if (!Number.isFinite(parsed) || parsed <= 0) return null;
    return parsed;
  };

  const effectiveSearchWidthPx = $derived(
    toPositiveInteger(data.siteSettings?.default_page_max_width_px) ??
      DEFAULT_PAGE_MAX_WIDTH_PX,
  );
  const searchSectionStyle = $derived(
    `max-width: min(100%, ${effectiveSearchWidthPx}px);`,
  );

  type FilterState = {
    q: string;
    gallery: string;
    category: string;
    tag: string;
  };

  type Direction = 'prev' | 'next';

  const sanitizeState = (input: FilterState): FilterState => ({
    q: input.q.trim(),
    gallery: data.galleries.some((entry) => entry.slug === input.gallery)
      ? input.gallery
      : '',
    category: data.categories.some((entry) => entry.slug === input.category)
      ? input.category
      : '',
    tag: data.tags.some((entry) => entry.slug === input.tag) ? input.tag : '',
  });

  const readUrlState = (url: URL): FilterState =>
    sanitizeState({
      q: url.searchParams.get('q') ?? '',
      gallery: url.searchParams.get('gallery') ?? '',
      category: url.searchParams.get('category') ?? '',
      tag: url.searchParams.get('tag') ?? '',
    });

  const readPhotoId = (url: URL) => {
    const photo = (url.searchParams.get('photo') ?? '').trim();
    return photo || null;
  };

  const serializeState = (state: FilterState, photoId: string | null = null) =>
    [
      state.q ? `q=${encodeURIComponent(state.q)}` : '',
      state.gallery ? `gallery=${encodeURIComponent(state.gallery)}` : '',
      state.category ? `category=${encodeURIComponent(state.category)}` : '',
      state.tag ? `tag=${encodeURIComponent(state.tag)}` : '',
      photoId ? `photo=${encodeURIComponent(photoId)}` : '',
    ]
      .filter(Boolean)
      .join('&');

  const readCurrentUrl = () =>
    typeof window === 'undefined' ? page.url : new URL(window.location.href);

  const isSameState = (a: FilterState, b: FilterState) =>
    a.q === b.q &&
    a.gallery === b.gallery &&
    a.category === b.category &&
    a.tag === b.tag;

  const matchesFilters = (
    photo: (typeof data.photos)[number],
    state: FilterState,
    normalizedTextQuery: string,
  ) => {
    if (state.gallery && photo.gallerySlug !== state.gallery) return false;
    if (
      state.category &&
      !photo.categories.some((entry) => entry.slug === state.category)
    ) {
      return false;
    }
    if (state.tag && !photo.tags.some((entry) => entry.slug === state.tag)) {
      return false;
    }
    if (
      normalizedTextQuery &&
      !photo.searchText.includes(normalizedTextQuery)
    ) {
      return false;
    }
    return true;
  };

  const filterPhotos = (state: FilterState) => {
    const normalizedTextQuery = state.q.trim().toLowerCase();
    return data.photos.filter((photo) =>
      matchesFilters(photo, state, normalizedTextQuery),
    );
  };

  const sanitizePhotoForState = (
    state: FilterState,
    photoId: string | null,
  ) => {
    if (!photoId) return null;
    const normalizedPhotoId = photoId.trim();
    if (!normalizedPhotoId) return null;

    const visible = filterPhotos(state);
    return visible.some((photo) => photo.id === normalizedPhotoId)
      ? normalizedPhotoId
      : null;
  };

  const initialUrl = readCurrentUrl();
  const initialFilters = readUrlState(initialUrl);
  const initialPhotoId = sanitizePhotoForState(
    initialFilters,
    readPhotoId(initialUrl),
  );

  let filters = $state<FilterState>(initialFilters);
  let activePhotoId = $state<string | null>(initialPhotoId);

  const replaceUrlWithState = (
    state: FilterState,
    photoId: string | null,
    currentUrl: URL = readCurrentUrl(),
  ) => {
    const nextKey = serializeState(state, photoId);
    const currentKey = serializeState(
      readUrlState(currentUrl),
      readPhotoId(currentUrl),
    );
    if (nextKey === currentKey) return;

    const target = nextKey
      ? `${currentUrl.pathname}?${nextKey}`
      : currentUrl.pathname;
    const resolvedTarget = resolve(target as `/${string}`);
    replaceState(resolvedTarget, page.state);
  };

  const syncFromUrl = (url: URL) => {
    const urlState = readUrlState(url);
    const rawPhotoId = readPhotoId(url);
    const nextPhotoId = sanitizePhotoForState(urlState, rawPhotoId);

    if (!isSameState(filters, urlState)) {
      filters = urlState;
    }
    if (activePhotoId !== nextPhotoId) {
      activePhotoId = nextPhotoId;
    }

    if (rawPhotoId && !nextPhotoId) {
      replaceUrlWithState(urlState, null, url);
    }
  };

  onMount(() => {
    const onPopState = () => {
      syncFromUrl(new URL(window.location.href));
    };

    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  });

  const visiblePhotos = $derived.by(() => filterPhotos(filters));
  const activeFilterSummary = $derived.by(() => {
    const summary: string[] = [];

    if (filters.q) {
      summary.push(`Query: ${filters.q}`);
      summary.push(`${visiblePhotos.length}/${data.photos.length} matches`);
    }
    if (filters.gallery) {
      summary.push(
        `Gallery: ${data.galleries.find((entry) => entry.slug === filters.gallery)?.name ?? filters.gallery}`,
      );
    }
    if (filters.category) {
      summary.push(
        `Category: ${data.categories.find((entry) => entry.slug === filters.category)?.name ?? filters.category}`,
      );
    }
    if (filters.tag) {
      summary.push(
        `Tag: ${data.tags.find((entry) => entry.slug === filters.tag)?.name ?? filters.tag}`,
      );
    }

    return summary;
  });
  const hasActiveFilters = $derived(activeFilterSummary.length > 0);
  const emptyStateCopy = $derived(
    hasActiveFilters
      ? 'No photographs match the current filters.'
      : 'No public photographs are available yet.',
  );

  const buildHref = (state: FilterState, photoId: string | null = null) => {
    const key = serializeState(state, photoId);
    const pathname = page.url.pathname;
    return key ? `${pathname}?${key}` : pathname;
  };

  const syncUrl = (nextState: FilterState, photoId = activePhotoId) => {
    const next = sanitizeState(nextState);
    const nextPhotoId = sanitizePhotoForState(next, photoId);

    if (!isSameState(filters, next)) {
      filters = next;
    }
    if (activePhotoId !== nextPhotoId) {
      activePhotoId = nextPhotoId;
    }

    replaceUrlWithState(next, nextPhotoId);
  };

  const pushUrl = (nextState: FilterState, photoId: string) => {
    const next = sanitizeState(nextState);
    const nextPhotoId = sanitizePhotoForState(next, photoId);
    if (!nextPhotoId) return;

    if (!isSameState(filters, next)) {
      filters = next;
    }
    if (activePhotoId !== nextPhotoId) {
      activePhotoId = nextPhotoId;
    }

    const currentUrl = readCurrentUrl();
    const nextKey = serializeState(next, nextPhotoId);
    const currentKey = serializeState(
      readUrlState(currentUrl),
      readPhotoId(currentUrl),
    );
    if (nextKey === currentKey) return;

    const target = nextKey
      ? `${currentUrl.pathname}?${nextKey}`
      : currentUrl.pathname;
    const resolvedTarget = resolve(target as `/${string}`);
    pushState(resolvedTarget, page.state);
  };

  const updateQuery = (event: Event) => {
    syncUrl({
      ...filters,
      q: (event.currentTarget as HTMLInputElement).value,
    });
  };

  const updateGallery = (event: Event) => {
    syncUrl({
      ...filters,
      gallery: (event.currentTarget as HTMLSelectElement).value,
    });
  };

  const updateCategory = (event: Event) => {
    syncUrl({
      ...filters,
      category: (event.currentTarget as HTMLSelectElement).value,
    });
  };

  const updateTag = (event: Event) => {
    syncUrl({
      ...filters,
      tag: (event.currentTarget as HTMLSelectElement).value,
    });
  };

  const clearFilters = () => {
    syncUrl(
      {
        q: '',
        gallery: '',
        category: '',
        tag: '',
      },
      null,
    );
  };

  const activePhoto = $derived.by(
    () =>
      (activePhotoId
        ? visiblePhotos.find((photo) => photo.id === activePhotoId)
        : null) ?? null,
  );

  const activePhotoIndex = $derived.by(() => {
    if (!activePhotoId) return -1;
    return visiblePhotos.findIndex((photo) => photo.id === activePhotoId);
  });
  const activePhotoPosition = $derived(
    activePhotoIndex >= 0 ? activePhotoIndex + 1 : 0,
  );

  const canNavigate = $derived(
    visiblePhotos.length > 1 && activePhotoIndex >= 0,
  );

  const movePhoto = (direction: Direction) => {
    if (!canNavigate) return;

    const currentIndex = activePhotoIndex;
    if (currentIndex < 0) return;

    const offset = direction === 'next' ? 1 : -1;
    const nextIndex =
      (currentIndex + offset + visiblePhotos.length) % visiblePhotos.length;
    const target = visiblePhotos[nextIndex];
    if (!target) return;

    pushUrl(filters, target.id);
  };

  const openPhoto = (event: MouseEvent, photoId: string) => {
    event.preventDefault();
    pushUrl(filters, photoId);
  };

  const closePhoto = (event?: MouseEvent | KeyboardEvent) => {
    event?.preventDefault();
    syncUrl(filters, null);
  };

  const onViewerKeydown = (event: KeyboardEvent) => {
    if (!activePhoto) return;
    if (event.repeat) return;

    if (event.key === 'Escape') {
      closePhoto(event);
      return;
    }

    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      movePhoto('prev');
      return;
    }

    if (event.key === 'ArrowRight') {
      event.preventDefault();
      movePhoto('next');
    }
  };

  $effect(() => {
    if (typeof document === 'undefined') return;
    document.body.style.overflow = activePhoto ? 'hidden' : '';
  });

  onDestroy(() => {
    if (typeof document !== 'undefined') {
      document.body.style.overflow = '';
    }
  });
</script>

<svelte:head>
  <title>Search</title>
</svelte:head>

<svelte:window onkeydown={onViewerKeydown} />

<section
  class="mx-auto flex w-full flex-col gap-8 px-5 py-8 sm:px-6 lg:px-8"
  style={searchSectionStyle}
>
  <section
    class="grid gap-4 rounded-sm border border-border bg-surface/70 p-5 backdrop-blur sm:grid-cols-2 sm:p-6 xl:grid-cols-[minmax(0,1.5fr)_repeat(3,minmax(0,0.75fr))]"
  >
    <label class="flex min-w-0 flex-col gap-2">
      <span class="text-xs tracking-[0.24em] text-text-muted uppercase">
        Search
      </span>
      <input
        value={filters.q}
        type="search"
        placeholder="Title, description, gallery, category, tag"
        class="w-full rounded-sm border border-border-strong bg-transparent px-4 py-3 text-sm transition-colors outline-none placeholder:text-text-muted focus:border-text"
        oninput={updateQuery}
      />
    </label>

    <label class="flex min-w-0 flex-col gap-2">
      <span class="text-xs tracking-[0.24em] text-text-muted uppercase">
        Gallery
      </span>
      <select
        value={filters.gallery}
        class="w-full rounded-sm border border-border-strong bg-transparent px-4 py-3 text-sm transition-colors outline-none focus:border-text"
        onchange={updateGallery}
      >
        <option value="">All public galleries</option>
        {#each data.galleries as option (option.slug)}
          <option value={option.slug}>{option.name}</option>
        {/each}
      </select>
    </label>

    <label class="flex min-w-0 flex-col gap-2">
      <span class="text-xs tracking-[0.24em] text-text-muted uppercase">
        Category
      </span>
      <select
        value={filters.category}
        class="w-full rounded-sm border border-border-strong bg-transparent px-4 py-3 text-sm transition-colors outline-none focus:border-text"
        onchange={updateCategory}
      >
        <option value="">All categories</option>
        {#each data.categories as option (option.slug)}
          <option value={option.slug}>{option.name}</option>
        {/each}
      </select>
    </label>

    <label class="flex min-w-0 flex-col gap-2">
      <span class="text-xs tracking-[0.24em] text-text-muted uppercase">
        Tag
      </span>
      <select
        value={filters.tag}
        class="w-full rounded-sm border border-border-strong bg-transparent px-4 py-3 text-sm transition-colors outline-none focus:border-text"
        onchange={updateTag}
      >
        <option value="">All tags</option>
        {#each data.tags as option (option.slug)}
          <option value={option.slug}>{option.name}</option>
        {/each}
      </select>
    </label>
  </section>

  <section class="space-y-4">
    <div class="flex flex-wrap items-center gap-2">
      {#if hasActiveFilters}
        {#each activeFilterSummary as item (item)}
          <span
            class="rounded-sm border border-border-strong bg-surface px-3 py-1 text-xs tracking-[0.22em] uppercase"
          >
            {item}
          </span>
        {/each}
      {/if}
    </div>

    {#if visiblePhotos.length === 0}
      <div
        class="grid min-h-64 place-items-center rounded-sm border border-dashed border-border-strong bg-surface-muted/40 p-8 text-center"
      >
        <div class="max-w-md space-y-3">
          <p class="text-lg font-medium">{emptyStateCopy}</p>
          <p class="text-sm leading-6 text-text-muted">
            Adjust the search or clear the active filters to return to the full
            public collection.
          </p>
          {#if hasActiveFilters}
            <button
              type="button"
              class="rounded-sm border border-border-strong px-4 py-2 text-xs tracking-[0.24em] uppercase transition-colors"
              onclick={clearFilters}
            >
              Clear filters
            </button>
          {/if}
        </div>
      </div>
    {:else}
      <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {#each visiblePhotos as photo (photo.id)}
          <a
            href={resolve(buildHref(filters, photo.id) as `/${string}`)}
            class="overflow-hidden rounded-sm border border-border bg-surface transition-colors transition-transform duration-200"
            onclick={(event: MouseEvent) => openPhoto(event, photo.id)}
          >
            <div class="aspect-[4/3] overflow-hidden bg-surface-muted/60">
              {#if photo.thumb}
                <img
                  src={photo.thumb}
                  alt={photo.thumbAlt}
                  class="h-full w-full object-cover transition duration-500"
                  loading="lazy"
                />
              {:else}
                <div
                  class="grid h-full w-full place-items-center px-6 text-center text-xs tracking-[0.24em] text-text-muted uppercase"
                >
                  Image pending
                </div>
              {/if}
            </div>

            <div class="flex items-start justify-between gap-4 p-4">
              <div class="min-w-0 space-y-1">
                <p class="truncate text-lg font-medium">{photo.title}</p>
                <p
                  class="truncate text-xs tracking-[0.24em] text-text-muted uppercase"
                >
                  {photo.galleryName}
                </p>
              </div>
              {#if photo.captureDate}
                <p class="shrink-0 text-xs text-text-muted">
                  {photo.captureDate}
                </p>
              {/if}
            </div>
          </a>
        {/each}
      </div>
    {/if}
  </section>
</section>

{#if activePhoto}
  <button
    type="button"
    class="fixed inset-0 z-50 bg-black/75"
    aria-label="Close photo viewer"
    onclick={(event: MouseEvent) => closePhoto(event)}
  ></button>

  <div
    class="fixed inset-0 z-[60] flex items-center justify-center px-4 py-6 sm:px-8"
    role="dialog"
    aria-modal="true"
    aria-label={activePhoto.title}
  >
    <div class="relative flex w-full max-w-6xl flex-col gap-4">
      <div class="flex items-center justify-between gap-3">
        <div class="min-w-0">
          <p class="truncate text-sm tracking-[0.2em] text-white uppercase">
            {activePhoto.title}
          </p>
          <p class="mt-1 text-xs tracking-[0.2em] text-white/70 uppercase">
            Image {activePhotoPosition} of {visiblePhotos.length}
          </p>
        </div>
        <button
          type="button"
          class="rounded-sm border border-white/60 px-3 py-2 text-xs tracking-[0.2em] text-white uppercase"
          onclick={(event: MouseEvent) => closePhoto(event)}
        >
          Close
        </button>
      </div>

      <div
        class="relative overflow-hidden rounded-sm border border-white/20 bg-black"
      >
        {#if activePhoto.thumb}
          <img
            src={activePhoto.thumb}
            alt={activePhoto.thumbAlt}
            class="max-h-[78vh] w-full object-contain"
          />
        {:else}
          <div
            class="grid h-[52vh] place-items-center text-xs tracking-[0.24em] text-white/70 uppercase"
          >
            Image pending
          </div>
        {/if}

        {#if canNavigate}
          <button
            type="button"
            class="absolute top-1/2 left-0 -translate-y-1/2 border border-white/30 bg-black/50 px-4 py-5 text-xl text-white"
            onclick={() => movePhoto('prev')}
            aria-label="Previous photo"
          >
            ←
          </button>

          <button
            type="button"
            class="absolute top-1/2 right-0 -translate-y-1/2 border border-white/30 bg-black/50 px-4 py-5 text-xl text-white"
            onclick={() => movePhoto('next')}
            aria-label="Next photo"
          >
            →
          </button>
        {/if}
      </div>

      <p class="text-xs tracking-[0.2em] text-white/70 uppercase">
        {activePhoto.galleryName}
      </p>
    </div>
  </div>
{/if}
