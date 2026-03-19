<script lang="ts">
  import { onMount } from 'svelte';
  import { resolve } from '$app/paths';
  import { invalidateAll } from '$app/navigation';

  import AdminBackLink from '$lib/components/admin/AdminBackLink.svelte';
  import AdminPageHeader from '$lib/components/admin/AdminPageHeader.svelte';
  import AdminToastEmitter from '$lib/components/admin/AdminToastEmitter.svelte';
  import { useAdminFormState } from '$lib/components/admin/useAdminFormState.svelte';
  import AdminSinglePhotoEditor from '$lib/components/admin/photos/AdminSinglePhotoEditor.svelte';

  const { data, form } = $props();
  const { message, success } = useAdminFormState(() => form);
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

  onMount(() => {
    if (!hasPendingConversions) return;
    const intervalId = setInterval(() => {
      void pollPendingConversions();
    }, 3000);
    return () => clearInterval(intervalId);
  });

  const gallerySlug = $derived(data.gallery.slug);
  const photoSlug = $derived(data.photo?.slug ?? '');
  const toastLinks = $derived({
    viewPage: resolve(`/${gallerySlug}/photo/${photoSlug}`),
    viewGallery: resolve(`/${gallerySlug}`),
  });
</script>

<AdminPageHeader title="Edit Photo" leading={backLink} toasts={headerToasts} />

{#snippet backLink()}
  <AdminBackLink
    href={resolve('/admin/[gallerySlug]/photos', { gallerySlug })}
    ariaLabel="Back to Gallery Photos"
  />
{/snippet}

{#snippet headerToasts()}
  <AdminToastEmitter
    {message}
    type={success ? 'success' : 'error'}
    links={success ? toastLinks : undefined}
  />
  <AdminToastEmitter
    message={data.message}
    type={data.messageSuccess ? 'success' : 'neutral'}
    clearQueryMessage
    links={data.messageSuccess ? toastLinks : undefined}
  />
  {#if hasPendingConversions}
    <p class="mt-2 text-xs text-text-muted">
      Auto-refreshing while image processing completes...
    </p>
  {/if}
{/snippet}

<AdminSinglePhotoEditor {data} {form} />
