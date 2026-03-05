<script lang="ts">
  import AdminButton from '$lib/components/admin/AdminButton.svelte';
  import AdminHeading from '$lib/components/admin/AdminHeading.svelte';
  import AdminSinglePhotoEditor from '$lib/components/admin/photos/AdminSinglePhotoEditor.svelte';

  const { data, form } = $props();
</script>

<div class="flex flex-col gap-3">
  <AdminHeading>Edit Photo /{data.gallery.slug}</AdminHeading>
  <AdminButton href={`/admin/${data.gallery.slug}/photos`}
    >Back to Photos</AdminButton
  >
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
