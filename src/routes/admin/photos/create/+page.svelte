<script lang="ts">
  import AdminButton from '$lib/components/admin/AdminButton.svelte';
  import AdminSinglePhotoEditor from '$lib/components/admin/photos/AdminSinglePhotoEditor.svelte';
  import type { PageProps } from './$types';

  let { data, form }: PageProps = $props();
  const formMessage = $derived(
    form && 'message' in form && typeof form.message === 'string' ? form.message : null
  );
  const formSuccess = $derived(form && 'success' in form ? form.success === true : false);
</script>

<div class="flex flex-wrap items-center justify-between gap-3">
  <h1 class="text-xl uppercase tracking-[var(--tracking-heading)]">New Photo</h1>
  <AdminButton href="/admin/photos">Back to Photos</AdminButton>
</div>
<p class="mt-2 text-sm text-text-muted">
  Type a title and upload immediately on this page. First upload creates a private draft automatically; nothing is public until you press Publish.
</p>

{#if formMessage}
  <p class={`mt-3 rounded border px-3 py-2 text-sm ${formSuccess ? 'border-success/40 bg-success-soft text-success' : 'border-danger/40 bg-danger-soft text-danger'}`}>
    {formMessage}
  </p>
{/if}

<AdminSinglePhotoEditor {data} />
