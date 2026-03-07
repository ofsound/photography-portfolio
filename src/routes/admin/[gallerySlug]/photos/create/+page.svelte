<script lang="ts">
  import AdminButton from '$lib/components/admin/AdminButton.svelte';
  import AdminHeading from '$lib/components/admin/AdminHeading.svelte';
  import AdminStatusMessage from '$lib/components/admin/AdminStatusMessage.svelte';
  import AdminSinglePhotoEditor from '$lib/components/admin/photos/AdminSinglePhotoEditor.svelte';
  import type { PageProps } from './$types';

  const { data, form }: PageProps = $props();
  const formMessage = $derived(
    form && 'message' in form && typeof form.message === 'string'
      ? form.message
      : null,
  );
  const formSuccess = $derived(
    form && 'success' in form ? form.success === true : false,
  );
</script>

<div class="flex flex-wrap items-center justify-between gap-3">
  <AdminHeading>New Photo /{data.gallery.slug}</AdminHeading>
  <AdminButton href={`/admin/${data.gallery.slug}/photos`}
    >Back to Photos</AdminButton
  >
</div>
<p class="mt-2 text-sm text-text-muted">
  Type a title and upload immediately on this page. First upload creates a
  private draft automatically; nothing is public until you press Publish.
</p>

{#if formMessage}
  <AdminStatusMessage type={formSuccess ? 'success' : 'error'} class="mt-3">
    {formMessage}
  </AdminStatusMessage>
{/if}

<AdminSinglePhotoEditor {data} />
