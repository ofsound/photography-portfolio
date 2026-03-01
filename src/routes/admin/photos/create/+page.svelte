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
<p class="mt-2 text-sm text-text-muted">You can upload images below; the first upload will create the photo. Use Save to set title and metadata. After saving, you can add categories.</p>

{#if formMessage}
  <p class={`mt-3 rounded border px-3 py-2 text-sm ${formSuccess ? 'border-success/40 bg-success-soft text-success' : 'border-danger/40 bg-danger-soft text-danger'}`}>
    {formMessage}
  </p>
{/if}

<AdminSinglePhotoEditor {data} />
