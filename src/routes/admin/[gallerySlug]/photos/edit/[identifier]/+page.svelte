<script lang="ts">
  /* eslint-disable svelte/no-navigation-without-resolve -- href is resolved in a derived value */
  import { resolve } from '$app/paths';
  import { invalidateAll } from '$app/navigation';

  import AdminHeading from '$lib/components/admin/AdminHeading.svelte';
  import AdminToastEmitter from '$lib/components/admin/AdminToastEmitter.svelte';
  import AdminSinglePhotoEditor from '$lib/components/admin/photos/AdminSinglePhotoEditor.svelte';

  const { data, form } = $props();
  let isPollingInFlight = $state(false);
  const hasPendingConversions = $derived(
    ((data.pendingConversionCount as number) ?? 0) > 0,
  );

  const pollPendingConversions = async () => {
    if (isPollingInFlight || !hasPendingConversions) return;
    isPollingInFlight = true;
    try {
      await invalidateAll();
    } finally {
      isPollingInFlight = false;
    }
  };

  $effect(() => {
    if (!hasPendingConversions) return;
    const intervalId = setInterval(() => {
      void pollPendingConversions();
    }, 3000);
    return () => clearInterval(intervalId);
  });

  const gallerySlug = $derived(data.gallery.slug);
  const backToGalleryPhotosHref = $derived(
    resolve('/admin/[gallerySlug]/photos', { gallerySlug }),
  );
</script>

<div class="flex items-center gap-3">
  <a
    href={backToGalleryPhotosHref}
    class="-m-2 p-2 text-text-muted transition-colors hover:text-brand"
    aria-label="Back to Gallery Photos"
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
  <AdminHeading>Edit Photo</AdminHeading>
</div>

<AdminToastEmitter
  message={form?.message}
  type={form && 'success' in form && form.success ? 'success' : 'error'}
/>
<AdminToastEmitter
  message={data.message}
  type={data.messageSuccess ? 'success' : 'neutral'}
  clearQueryMessage
/>
{#if hasPendingConversions}
  <p class="mt-2 text-xs text-text-muted">
    Auto-refreshing while image processing completes...
  </p>
{/if}

<AdminSinglePhotoEditor {data} {form} />
