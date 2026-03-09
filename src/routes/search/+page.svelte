<script lang="ts">
  import { replaceState } from '$app/navigation';
  import { resolve } from '$app/paths';
  import { page } from '$app/state';
  import { onMount } from 'svelte';

  import { buildGalleryPhotoPath } from '$lib/utils/gallery-routes';

  const { data }: import('./$types').PageProps = $props();

  type FilterState = {
    q: string;
    gallery: string;
    category: string;
    tag: string;
  };

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

  const serializeState = (state: FilterState) =>
    [
      state.q ? `q=${encodeURIComponent(state.q)}` : '',
      state.gallery ? `gallery=${encodeURIComponent(state.gallery)}` : '',
      state.category ? `category=${encodeURIComponent(state.category)}` : '',
      state.tag ? `tag=${encodeURIComponent(state.tag)}` : '',
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

  let filters = $state<FilterState>(readUrlState(readCurrentUrl()));

  const syncFromUrl = (url: URL) => {
    const urlState = readUrlState(url);
    if (isSameState(filters, urlState)) return;
    filters = urlState;
  };

  onMount(() => {
    const onPopState = () => {
      syncFromUrl(new URL(window.location.href));
    };

    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  });

  const normalizedQuery = $derived(filters.q.trim().toLowerCase());
  const visiblePhotos = $derived.by(() =>
    data.photos.filter((photo) => {
      if (filters.gallery && photo.gallerySlug !== filters.gallery)
        return false;
      if (
        filters.category &&
        !photo.categories.some((entry) => entry.slug === filters.category)
      ) {
        return false;
      }
      if (
        filters.tag &&
        !photo.tags.some((entry) => entry.slug === filters.tag)
      ) {
        return false;
      }
      if (normalizedQuery && !photo.searchText.includes(normalizedQuery)) {
        return false;
      }
      return true;
    }),
  );
  const activeFilterSummary = $derived.by(() => {
    const summary: string[] = [];

    if (filters.q) summary.push(`Query: ${filters.q}`);
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

  const syncUrl = (nextState: FilterState) => {
    const next = sanitizeState(nextState);
    if (!isSameState(filters, next)) {
      filters = next;
    }

    const currentUrl = readCurrentUrl();
    const nextKey = serializeState(next);
    const currentKey = serializeState(readUrlState(currentUrl));
    if (nextKey === currentKey) return;

    const target = nextKey
      ? `${currentUrl.pathname}?${nextKey}`
      : currentUrl.pathname;
    const resolvedTarget = resolve(target as `/${string}`);
    replaceState(resolvedTarget, page.state);
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
    syncUrl({
      q: '',
      gallery: '',
      category: '',
      tag: '',
    });
  };
</script>

<svelte:head>
  <title>Search</title>
</svelte:head>

<section
  class="mx-auto flex w-full max-w-7xl flex-col gap-8 px-5 py-8 sm:px-6 lg:px-8"
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
            href={resolve(
              buildGalleryPhotoPath(
                photo.gallerySlug,
                photo.slug,
              ) as `/${string}`,
            )}
            class="overflow-hidden rounded-sm border border-border bg-surface transition-colors transition-transform duration-200"
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
