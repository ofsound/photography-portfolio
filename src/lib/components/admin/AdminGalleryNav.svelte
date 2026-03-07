<script lang="ts">
  /* eslint-disable svelte/no-navigation-without-resolve -- photosHref/uploadHref are derived from resolve() */
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
      class="-m-2 p-2 text-text-muted transition-colors hover:text-brand"
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
        variant="default"
        size="xs"
        selected={!showArchived}
      >
        Active ({activeCount})
      </AdminButton>
      <AdminButton
        href={`${photosHref}?showArchived=1`}
        variant="default"
        size="xs"
        selected={showArchived}
      >
        Archived ({archivedCount})
      </AdminButton>
    {/if}
  </div>

  <!-- View tabs (center) -->
  <div class="flex items-center gap-4">
    <div class="relative flex rounded-md bg-surface-muted">
      <a
        href={resolve(photosRoute, { gallerySlug })}
        class="relative z-10 grid place-items-center rounded-md px-4 py-1.5 text-xs font-semibold tracking-wider uppercase transition-all duration-300 ease-(--ease-cinematic)"
        class:text-brand-contrast={currentView === 'photos'}
        class:text-text-subtle={currentView !== 'photos'}
        class:hover:text-text={currentView !== 'photos'}
      >
        {#if currentView === 'photos'}
          <span class="absolute inset-0 rounded-md bg-brand"></span>
        {/if}
        <span class="relative">Photos</span>
      </a>
      <a
        href={resolve(detailsRoute, { gallerySlug })}
        class="relative z-10 grid place-items-center rounded-md px-4 py-1.5 text-xs font-semibold tracking-wider uppercase transition-all duration-300 ease-(--ease-cinematic)"
        class:text-brand-contrast={currentView === 'details'}
        class:text-text-subtle={currentView !== 'details'}
        class:hover:text-text={currentView !== 'details'}
      >
        {#if currentView === 'details'}
          <span class="absolute inset-0 rounded-md bg-brand"></span>
        {/if}
        <span class="relative">Details</span>
      </a>
    </div>
  </div>
</nav>

<!-- Add Photos (left) -->
{#if currentView === 'photos'}
  <div class="flex flex-wrap items-center gap-3 pt-1">
    <!-- Variation A: Soft gradient with camera icon -->
    <a
      href={uploadHref}
      class="group inline-flex items-center gap-2 rounded-lg bg-linear-to-r from-brand to-indigo-500 px-4 py-2 text-sm font-semibold tracking-wider text-white transition-all hover:scale-[1.01] active:scale-[0.98]"
    >
      <svg
        class="size-4 transition-transform group-hover:scale-101"
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
