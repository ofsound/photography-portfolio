<script lang="ts">
  import { resolve } from '$app/paths';

  import AdminButton from '$lib/components/admin/AdminButton.svelte';
  import AdminHeading from '$lib/components/admin/AdminHeading.svelte';

  const {
    galleryName,
    gallerySlug,
    activeCount = 0,
    archivedCount = 0,
    showArchived = false,
    currentView,
  } = $props<{
    galleryName: string;
    gallerySlug: string;
    activeCount?: number;
    archivedCount?: number;
    showArchived?: boolean;
    currentView: 'photos' | 'details';
  }>();

  const photosRoute = '/admin/[gallerySlug]/photos' as const;
  const detailsRoute = '/admin/[gallerySlug]/details' as const;
  const uploadRoute = '/admin/[gallerySlug]/photos/upload' as const;

  const photosHref = $derived(resolve(photosRoute, { gallerySlug }));
  const uploadHref = $derived(resolve(uploadRoute, { gallerySlug }));
</script>

<nav class="mb-6 flex justify-between">
  <!-- Gallery title + back link + Active/Archived badges (left) -->
  <div class="flex items-center gap-3">
    <a
      href={resolve('/admin/galleries')}
      class="text-text-muted transition-colors hover:text-brand"
      aria-label="Back to Galleries"
    >
      <svg
        class="size-4"
        viewBox="0 0 16 16"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <path d="M10 3 5 8l5 5" />
      </svg>
    </a>
    <AdminHeading>{galleryName}</AdminHeading>
    {#if currentView === 'photos'}
      <AdminButton
        href={photosHref}
        variant="pill-success"
        selected={!showArchived}
      >
        Active <span class="opacity-70">{activeCount}</span>
      </AdminButton>
      <AdminButton
        href={`${photosHref}?showArchived=1`}
        variant="pill-danger"
        selected={showArchived}
      >
        Archived <span class="opacity-70">{archivedCount}</span>
      </AdminButton>
    {/if}
  </div>

  <!-- View tabs (center) -->
  <div class="flex items-center gap-4">
    <!-- ORIGINAL -->
    <div class="flex overflow-hidden rounded-md border border-border">
      <a
        href={resolve(photosRoute, { gallerySlug })}
        class="relative px-3.5 py-1.5 text-xs font-medium tracking-widest uppercase transition-colors"
        class:bg-brand={currentView === 'photos'}
        class:text-brand-contrast={currentView === 'photos'}
        class:hover:bg-surface-muted={currentView !== 'photos'}
        class:text-text-muted={currentView !== 'photos'}
      >
        Photos
      </a>
      <a
        href={resolve(detailsRoute, { gallerySlug })}
        class="relative border-l border-border px-3.5 py-1.5 text-xs font-medium tracking-widest uppercase transition-colors"
        class:bg-brand={currentView === 'details'}
        class:text-brand-contrast={currentView === 'details'}
        class:hover:bg-surface-muted={currentView !== 'details'}
        class:text-text-muted={currentView !== 'details'}
      >
        Details
      </a>
    </div>

    <!-- VARIATION A: Pill slider with animated background -->
    <div class="relative flex rounded-full bg-surface-muted p-1">
      <a
        href={resolve(photosRoute, { gallerySlug })}
        class="relative z-10 grid place-items-center rounded-full px-4 py-1.5 text-xs font-semibold tracking-wide uppercase transition-all duration-300 ease-(--ease-cinematic)"
        class:text-brand-contrast={currentView === 'photos'}
        class:text-text-subtle={currentView !== 'photos'}
        class:hover:text-text={currentView !== 'photos'}
      >
        {#if currentView === 'photos'}
          <span
            class="absolute inset-0 rounded-full bg-brand shadow-md shadow-brand/25"
          ></span>
        {/if}
        <span class="relative">Photos</span>
      </a>
      <a
        href={resolve(detailsRoute, { gallerySlug })}
        class="relative z-10 grid place-items-center rounded-full px-4 py-1.5 text-xs font-semibold tracking-wide uppercase transition-all duration-300 ease-(--ease-cinematic)"
        class:text-brand-contrast={currentView === 'details'}
        class:text-text-subtle={currentView !== 'details'}
        class:hover:text-text={currentView !== 'details'}
      >
        {#if currentView === 'details'}
          <span
            class="absolute inset-0 rounded-full bg-brand shadow-md shadow-brand/25"
          ></span>
        {/if}
        <span class="relative">Details</span>
      </a>
    </div>

    <!-- VARIATION B: Underline indicator with fade -->
    <div class="flex gap-1">
      <a
        href={resolve(photosRoute, { gallerySlug })}
        class="group relative grid place-items-center px-4 py-2 text-xs font-semibold tracking-widest uppercase transition-colors duration-200"
        class:text-brand={currentView === 'photos'}
        class:text-text-subtle={currentView !== 'photos'}
        class:hover:text-text-muted={currentView !== 'photos'}
      >
        Photos
        <span
          class="absolute bottom-0 left-1/2 h-0.5 -translate-x-1/2 rounded-full transition-all duration-300 ease-(--ease-cinematic) {currentView ===
          'photos'
            ? 'w-3/4 bg-brand'
            : 'w-0 group-hover:w-1/2 group-hover:bg-border-strong'}"
        ></span>
      </a>
      <a
        href={resolve(detailsRoute, { gallerySlug })}
        class="group relative grid place-items-center px-4 py-2 text-xs font-semibold tracking-widest uppercase transition-colors duration-200"
        class:text-brand={currentView === 'details'}
        class:text-text-subtle={currentView !== 'details'}
        class:hover:text-text-muted={currentView !== 'details'}
      >
        Details
        <span
          class="absolute bottom-0 left-1/2 h-0.5 -translate-x-1/2 rounded-full transition-all duration-300 ease-(--ease-cinematic) {currentView ===
          'details'
            ? 'w-3/4 bg-brand'
            : 'w-0 group-hover:w-1/2 group-hover:bg-border-strong'}"
        ></span>
      </a>
    </div>

    <!-- VARIATION C: Frosted glass capsule with glow -->
    <div
      class="flex rounded-xl border border-border/50 bg-surface/60 p-0.5 shadow-sm backdrop-blur-sm"
    >
      <a
        href={resolve(photosRoute, { gallerySlug })}
        class="grid place-items-center rounded-[10px] px-4 py-1.5 text-xs font-semibold tracking-wide uppercase transition-all duration-300 ease-(--ease-cinematic) {currentView ===
        'photos'
          ? 'bg-brand text-brand-contrast shadow-lg shadow-brand/20'
          : 'text-text-subtle hover:bg-surface-muted/50 hover:text-text'}"
      >
        Photos
      </a>
      <a
        href={resolve(detailsRoute, { gallerySlug })}
        class="grid place-items-center rounded-[10px] px-4 py-1.5 text-xs font-semibold tracking-wide uppercase transition-all duration-300 ease-(--ease-cinematic) {currentView ===
        'details'
          ? 'bg-brand text-brand-contrast shadow-lg shadow-brand/20'
          : 'text-text-subtle hover:bg-surface-muted/50 hover:text-text'}"
      >
        Details
      </a>
    </div>

    <!-- VARIATION D: Minimal dot indicator -->
    <div class="flex">
      <a
        href={resolve(photosRoute, { gallerySlug })}
        class="group relative grid place-items-center rounded-lg px-4 py-2 text-xs tracking-widest uppercase transition-all duration-200 {currentView ===
        'photos'
          ? 'font-bold text-text'
          : 'font-medium text-text-subtle/50 hover:text-text-subtle'}"
      >
        Photos
        {#if currentView === 'photos'}
          <span
            class="absolute bottom-0.5 left-1/2 size-1 -translate-x-1/2 rounded-full bg-brand"
          ></span>
        {/if}
      </a>
      <span class="mx-0.5 self-center text-border">|</span>
      <a
        href={resolve(detailsRoute, { gallerySlug })}
        class="group relative grid place-items-center rounded-lg px-4 py-2 text-xs tracking-widest uppercase transition-all duration-200 {currentView ===
        'details'
          ? 'font-bold text-text'
          : 'font-medium text-text-subtle/50 hover:text-text-subtle'}"
      >
        Details
        {#if currentView === 'details'}
          <span
            class="absolute bottom-0.5 left-1/2 size-1 -translate-x-1/2 rounded-full bg-brand"
          ></span>
        {/if}
      </a>
    </div>
  </div>
</nav>

<!-- Add Photos (left) -->
{#if currentView === 'photos'}
  <div class="mb-6 flex flex-wrap items-center gap-3 pt-1">
    <AdminButton href={uploadHref} variant="submit" size="md">
      + Add Photos
    </AdminButton>

    <!-- Variation A: Soft gradient with camera icon -->
    <a
      href={resolve(uploadRoute, { gallerySlug })}
      class="group inline-flex items-center gap-2 rounded-lg bg-linear-to-r from-brand to-indigo-500 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-brand/25 transition-all hover:scale-[1.03] hover:shadow-lg hover:shadow-brand/30 active:scale-[0.98]"
    >
      <svg
        class="size-4 transition-transform group-hover:rotate-12"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <path
          d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"
        />
        <circle cx="12" cy="13" r="4" />
      </svg>
      Add Photos
    </a>

    <!-- Variation B: Outlined pill with arrow icon -->
    <a
      href={resolve(uploadRoute, { gallerySlug })}
      class="group inline-flex items-center gap-2 rounded-full border-2 border-brand/50 px-4 py-1.5 text-sm font-medium text-brand transition-all hover:border-brand hover:bg-brand/10 hover:shadow-sm"
    >
      <svg
        class="size-4 transition-transform group-hover:-translate-y-0.5"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="17 8 12 3 7 8" />
        <line x1="12" y1="3" x2="12" y2="15" />
      </svg>
      Upload Photos
    </a>

    <!-- Variation C: Glass card with sparkle icon -->
    <a
      href={resolve(uploadRoute, { gallerySlug })}
      class="group relative inline-flex items-center gap-2 overflow-hidden rounded-lg border border-white/20 bg-white/10 px-4 py-2 text-sm font-medium text-text backdrop-blur-sm transition-all hover:border-brand/40 hover:bg-brand/5 hover:shadow-md dark:border-white/10 dark:bg-white/5"
    >
      <span
        class="absolute inset-0 -translate-x-full bg-linear-to-r from-transparent via-brand/10 to-transparent transition-transform duration-500 group-hover:translate-x-full"
      ></span>
      <svg
        class="relative size-4 text-brand transition-transform group-hover:scale-110"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <polygon
          points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"
        />
      </svg>
      <span class="relative">Add Photos</span>
    </a>

    <!-- Variation D: Solid rounded with image-plus icon + badge feel -->
    <a
      href={resolve(uploadRoute, { gallerySlug })}
      class="group inline-flex items-center gap-2 rounded-md bg-success/90 px-4 py-2 text-sm font-bold tracking-wide text-white ring-1 ring-success/30 ring-offset-1 ring-offset-bg transition-all hover:bg-success hover:ring-success/60 hover:ring-offset-2 active:scale-[0.97]"
    >
      <svg
        class="size-4 transition-transform group-hover:scale-110"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
        <circle cx="8.5" cy="8.5" r="1.5" />
        <polyline points="21 15 16 10 5 21" />
        <line x1="16" y1="5" x2="22" y2="5" />
        <line x1="19" y1="2" x2="19" y2="8" />
      </svg>
      Add Photos
    </a>
  </div>
{/if}
