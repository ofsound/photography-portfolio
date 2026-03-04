<script lang="ts">
  import AdminButton from '$lib/components/admin/AdminButton.svelte';
  import AdminSinglePhotoEditor from '$lib/components/admin/photos/AdminSinglePhotoEditor.svelte';

  const { data, form } = $props();
</script>

<div class="flex flex-col gap-3">
  <AdminButton href="/admin/photos">Back to Photos</AdminButton>
  <h2 class="text-xl tracking-(--tracking-heading) uppercase">Details</h2>
</div>

{#if form?.message}
  <p class="mt-3 rounded border border-border px-3 py-2 text-sm">
    {form.message}
  </p>
{/if}
{#if data.message}
  <p class="mt-3 rounded border border-border px-3 py-2 text-sm">
    {data.message}
  </p>
{/if}

<AdminSinglePhotoEditor {data} />
