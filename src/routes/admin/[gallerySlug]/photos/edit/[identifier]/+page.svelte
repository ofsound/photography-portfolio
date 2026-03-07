<script lang="ts">
  import { invalidateAll } from '$app/navigation';

  import AdminButton from '$lib/components/admin/AdminButton.svelte';
  import AdminHeading from '$lib/components/admin/AdminHeading.svelte';
  import AdminStatusMessage from '$lib/components/admin/AdminStatusMessage.svelte';
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
</script>

<div class="flex flex-col gap-3">
  <AdminHeading>Edit Photo /{data.gallery.slug}</AdminHeading>
  <AdminButton href={`/admin/${data.gallery.slug}/photos`}
    >Back to Photos</AdminButton
  >
</div>

{#if form?.message}
  <AdminStatusMessage
    type={form && 'success' in form && form.success ? 'success' : 'error'}
    class="mt-3"
  >
    {form.message}
  </AdminStatusMessage>
{/if}
{#if data.message}
  <AdminStatusMessage type="neutral" class="mt-3">
    {data.message}
  </AdminStatusMessage>
{/if}
{#if hasPendingConversions}
  <p class="mt-2 text-xs text-text-muted">
    Auto-refreshing while image processing completes...
  </p>
{/if}

<AdminSinglePhotoEditor {data} />
