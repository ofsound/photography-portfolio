<script lang="ts">
  import AdminButton from '$lib/components/admin/AdminButton.svelte';

  let { photoId, existingImageCount = 0 } = $props<{ photoId: string; existingImageCount?: number }>();

  const defaultKind = $derived(existingImageCount === 0 ? 'lead' : 'additional');
</script>

<form method="POST" action="?/uploadImage" enctype="multipart/form-data" class="grid gap-2 rounded-lg border-2 border-dashed border-border-strong bg-surface p-4">
  <input type="hidden" name="photo_id" value={photoId} />
  <p class="text-xs uppercase tracking-[0.12em]">Upload Image (source/; conversion async)</p>
  <div class="grid gap-2 sm:grid-cols-4">
    <input type="file" name="image_file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif" class="sm:col-span-2" required />
    <select name="kind" class="rounded border border-border-strong px-3 py-2 text-sm">
      <option value="lead" selected={defaultKind === 'lead'}>Lead image</option>
      <option value="additional" selected={defaultKind === 'additional'}>Additional image</option>
    </select>
    <input name="alt_text" placeholder="Alt text" class="rounded border border-border-strong px-3 py-2" />
  </div>
  <p class="text-xs text-text-muted">
    {#if defaultKind === 'lead'}
      First image defaults to <strong>Lead</strong> (cover). Subsequent uploads default to Additional.
    {:else}
      Choose <strong>Additional image</strong> for gallery uploads. Use <strong>Lead image</strong> only for the cover.
    {/if}
  </p>
  <AdminButton type="submit">Upload</AdminButton>
</form>
