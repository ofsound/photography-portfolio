<script lang="ts">
  import { enhance } from '$app/forms';
  import { invalidateAll } from '$app/navigation';
  import AdminCard from '$lib/components/admin/AdminCard.svelte';
  import AdminButton from '$lib/components/admin/AdminButton.svelte';
  import AdminHeading from '$lib/components/admin/AdminHeading.svelte';

  const {
    photoId,
    galleryId = '',
    draftTitle = '',
    draftSlug = '',
  } = $props<{
    photoId: string;
    galleryId?: string;
    draftTitle?: string;
    draftSlug?: string;
  }>();

  let fileName = $state<string | null>(null);
  let uploading = $state(false);

  function handleFileChange(e: Event) {
    const input = e.currentTarget as HTMLInputElement;
    fileName = input.files?.[0]?.name ?? null;
  }
</script>

<AdminCard variant="upload-dashed" class="p-4">
  <form
    method="POST"
    action="?/uploadImage"
    enctype="multipart/form-data"
    class="grid gap-6"
    use:enhance={() => {
      uploading = true;
      return async ({ update }) => {
        await update({ reset: false });
        await invalidateAll();
        uploading = false;
        fileName = null;
      };
    }}
  >
    <input type="hidden" name="photo_id" value={photoId} />
    {#if galleryId}
      <input type="hidden" name="gallery_id" value={galleryId} />
    {/if}
    <input type="hidden" name="draft_title" value={draftTitle} />
    <input type="hidden" name="draft_slug" value={draftSlug} />
    <AdminHeading level={3}>Upload Additional Images</AdminHeading>
    <div class="grid gap-2">
      <div class="flex flex-wrap items-center gap-2">
        <AdminButton as="label" class="relative">
          <input
            type="file"
            name="image_file"
            accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
            required
            class="absolute inset-0 cursor-pointer opacity-0"
            onchange={handleFileChange}
          />
          Choose file
        </AdminButton>
        <span class="min-w-0 truncate text-sm text-text-muted">
          {fileName ?? 'No file chosen'}
        </span>
      </div>
    </div>
    <div class="flex justify-center">
      <AdminButton type="submit" disabled={uploading}>
        {uploading ? 'Uploading…' : 'Upload'}
      </AdminButton>
    </div>
  </form>
</AdminCard>
