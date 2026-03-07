<script lang="ts">
  import AdminButton from '$lib/components/admin/AdminButton.svelte';
  import AdminHeading from '$lib/components/admin/AdminHeading.svelte';
  import AdminStatusMessage from '$lib/components/admin/AdminStatusMessage.svelte';
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

<AdminSinglePhotoEditor {data} />
