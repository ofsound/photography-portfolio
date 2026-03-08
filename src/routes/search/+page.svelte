<script lang="ts">
  import { pushState, replaceState } from '$app/navigation';
  import { resolve } from '$app/paths';
  import { page } from '$app/state';

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

  const state = $derived(readUrlState(page.url));
  const normalizedQuery = $derived(state.q.trim().toLowerCase());
  const visiblePhotos = $derived.by(() =>
    data.photos.filter((photo) => {
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
      if (normalizedQuery && !photo.searchText.includes(normalizedQuery)) {
        return false;
      }
      return true;
    }),
  );
  const activeFilterSummary = $derived.by(() => {
    const summary: string[] = [];

    if (state.q) summary.push(`Query: ${state.q}`);
    if (state.gallery) {
      summary.push(
        `Gallery: ${data.galleries.find((entry) => entry.slug === state.gallery)?.name ?? state.gallery}`,
      );
    }
    if (state.category) {
      summary.push(
        `Category: ${data.categories.find((entry) => entry.slug === state.category)?.name ?? state.category}`,
      );
    }
    if (state.tag) {
      summary.push(
        `Tag: ${data.tags.find((entry) => entry.slug === state.tag)?.name ?? state.tag}`,
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
    const nextKey = serializeState(next);
    const currentKey = page.url.searchParams.toString();

    if (nextKey === currentKey) return;

    const target = nextKey
      ? `${page.url.pathname}?${nextKey}`
      : page.url.pathname;
    const resolvedTarget = resolve(target as `/${string}`);

    if (currentKey !== serializeState(readUrlState(page.url))) {
      replaceState(resolvedTarget, page.state);
      return;
    }

    pushState(resolvedTarget, page.state);
  };

  const updateQuery = (event: Event) => {
    syncUrl({
      ...state,
      q: (event.currentTarget as HTMLInputElement).value,
    });
  };

  const updateGallery = (event: Event) => {
    syncUrl({
      ...state,
      gallery: (event.currentTarget as HTMLSelectElement).value,
    });
  };

  const updateCategory = (event: Event) => {
    syncUrl({
      ...state,
      category: (event.currentTarget as HTMLSelectElement).value,
    });
  };

  const updateTag = (event: Event) => {
    syncUrl({
      ...state,
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
  <header
    class="grid gap-5 rounded-3xl border border-border bg-surface/80 p-5 shadow-sm backdrop-blur sm:p-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(18rem,0.8fr)] lg:items-end"
  >
    <div class="space-y-3">
      <p class="text-xs tracking-[0.35em] text-text-muted uppercase">
        Public gallery explorer
      </p>
      <div class="space-y-2">
        <h1 class="text-3xl font-semibold tracking-tight sm:text-4xl">
          Search across every public photograph.
        </h1>
        <p class="max-w-3xl text-sm leading-6 text-text-muted sm:text-base">
          Browse the full public archive with live filtering across galleries,
          tags, categories, and descriptive text.
        </p>
      </div>
    </div>

    <div class="rounded-2xl border border-border-strong bg-bg/70 p-4">
      <p class="text-xs tracking-[0.28em] text-text-muted uppercase">Visible</p>
      <div class="mt-2 flex items-end justify-between gap-4">
        <div>
          <p class="text-3xl font-semibold tabular-nums">
            {visiblePhotos.length}
          </p>
          <p class="text-sm text-text-muted">
            of {data.photos.length} public photographs
          </p>
        </div>
        {#if hasActiveFilters}
          <button
            type="button"
            class="rounded-full border border-border-strong px-3 py-1.5 text-xs tracking-[0.24em] uppercase transition-colors hover:bg-surface-muted"
            onclick={clearFilters}
          >
            Reset all
          </button>
        {/if}
      </div>
    </div>
  </header>

  <section
    class="grid gap-4 rounded-3xl border border-border bg-surface/70 p-5 shadow-sm backdrop-blur sm:grid-cols-2 sm:p-6 xl:grid-cols-[minmax(0,1.5fr)_repeat(3,minmax(0,0.75fr))]"
  >
    <label class="flex min-w-0 flex-col gap-2">
      <span class="text-xs tracking-[0.24em] text-text-muted uppercase">
        Search
      </span>
      <input
        value={state.q}
        type="search"
        placeholder="Title, description, gallery, category, tag"
        class="w-full rounded-2xl border border-border-strong bg-transparent px-4 py-3 text-sm transition-colors outline-none placeholder:text-text-muted focus:border-text"
        oninput={updateQuery}
      />
    </label>

    <label class="flex min-w-0 flex-col gap-2">
      <span class="text-xs tracking-[0.24em] text-text-muted uppercase">
        Gallery
      </span>
      <select
        value={state.gallery}
        class="w-full rounded-2xl border border-border-strong bg-transparent px-4 py-3 text-sm transition-colors outline-none focus:border-text"
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
        value={state.category}
        class="w-full rounded-2xl border border-border-strong bg-transparent px-4 py-3 text-sm transition-colors outline-none focus:border-text"
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
        value={state.tag}
        class="w-full rounded-2xl border border-border-strong bg-transparent px-4 py-3 text-sm transition-colors outline-none focus:border-text"
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
            class="rounded-full border border-border-strong bg-surface px-3 py-1 text-xs tracking-[0.22em] uppercase"
          >
            {item}
          </span>
        {/each}
      {:else}
        <span
          class="rounded-full border border-border bg-surface px-3 py-1 text-xs tracking-[0.22em] text-text-muted uppercase"
        >
          Showing the full public archive
        </span>
      {/if}
    </div>

    {#if visiblePhotos.length === 0}
      <div
        class="grid min-h-64 place-items-center rounded-3xl border border-dashed border-border-strong bg-surface-muted/40 p-8 text-center"
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
              class="rounded-full border border-border-strong px-4 py-2 text-xs tracking-[0.24em] uppercase transition-colors hover:bg-surface"
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
            class="group overflow-hidden rounded-3xl border border-border bg-surface shadow-sm transition-colors transition-transform duration-200 hover:-translate-y-0.5 hover:border-border-strong hover:shadow-md"
          >
            <div class="aspect-[4/3] overflow-hidden bg-surface-muted/60">
              {#if photo.thumb}
                <img
                  src={photo.thumb}
                  alt={photo.thumbAlt}
                  class="h-full w-full object-cover transition duration-500 group-hover:scale-[1.02]"
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
