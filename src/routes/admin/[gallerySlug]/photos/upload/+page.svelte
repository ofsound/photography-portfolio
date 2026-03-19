<script lang="ts">
  import { goto } from '$app/navigation';
  import { resolve } from '$app/paths';
  import { page } from '$app/state';

  import AdminCard from '$lib/components/admin/AdminCard.svelte';
  import AdminBackLink from '$lib/components/admin/AdminBackLink.svelte';
  import AdminButton from '$lib/components/admin/AdminButton.svelte';
  import AdminCreateListLayout from '$lib/components/admin/AdminCreateListLayout.svelte';
  import AdminStatusMessage from '$lib/components/admin/AdminStatusMessage.svelte';
  import {
    statusLabel,
    uploadBarClasses,
    usePhotoUploadQueue,
  } from '$lib/components/admin/usePhotoUploadQueue.svelte';

  const { data } = $props();
  const basePhotosPath = $derived(
    page.url.pathname.replace(/\/upload\/?$/, ''),
  );
  const uploader = usePhotoUploadQueue<
    { photoId?: string },
    { photoId: string | null }
  >({
    buildFormData: (item) => {
      const formData = new FormData();
      formData.set('image_file', item.file);
      return formData;
    },
    createItemExtra: () => ({ photoId: null }),
    getPostUrl: () => page.url.pathname,
    onUploadSuccess: (item, payload) => {
      item.photoId = payload?.photoId ?? null;
    },
    parseSuccessData: (parsed) => ({
      photoId: typeof parsed.photoId === 'string' ? parsed.photoId : undefined,
    }),
  });

  async function startUploads() {
    const isSingleUpload = uploader.uploadQueue.length === 1;
    const result = await uploader.startUploads();
    if (!result) return;

    if (isSingleUpload) {
      const singleItem = result.items[0];
      if (singleItem?.status === 'success' && singleItem.photoId) {
        const editUrl = `${basePhotosPath}/edit/${singleItem.photoId}?message=${encodeURIComponent('Image uploaded.')}&success=1`;
        await goto(resolve(editUrl as `/${string}`));
        return;
      }
      if (singleItem?.status === 'error') {
        return;
      }
    }

    await goto(resolve(basePhotosPath as `/${string}`));
  }
</script>

<AdminCreateListLayout
  title={`${data.gallery.name}: Upload`}
  create={uploadPanel}
  list={uploadQueuePanel}
  leading={backLink}
/>

{#snippet backLink()}
  <AdminBackLink
    href={resolve(basePhotosPath as `/${string}`)}
    ariaLabel={`Back to ${data.gallery.name}`}
  />
{/snippet}

{#snippet uploadQueuePanel()}
  <div class="grid gap-4">
    <div
      class="flex min-w-0 flex-wrap gap-4 rounded border border-border bg-surface-muted p-3 text-xs"
    >
      <p>Total: <span class="font-medium">{uploader.totalCount}</span></p>
      <p>Queued: <span class="font-medium">{uploader.queuedCount}</span></p>
      <p>
        Uploading: <span class="font-medium">{uploader.uploadingCount}</span>
      </p>
      <p>
        Success: <span class="font-medium text-success"
          >{uploader.successCount}</span
        >
      </p>
      <p>
        Failed: <span class="font-medium text-danger"
          >{uploader.errorCount}</span
        >
      </p>
    </div>

    {#if uploader.uploadQueue.length === 0}
      <p class="text-sm text-text-muted">Select images to begin uploading.</p>
    {:else}
      <section class="grid gap-2">
        {#each uploader.uploadQueue as item (item.id)}
          <AdminCard as="article" class="grid gap-2 p-3">
            <div class="flex flex-wrap items-center justify-between gap-2">
              <p class="min-w-0 flex-1 truncate text-sm">{item.displayName}</p>
              <AdminStatusMessage
                type={item.status === 'success'
                  ? 'success'
                  : item.status === 'error'
                    ? 'error'
                    : 'neutral'}
                class="px-2 py-1 text-xs"
              >
                {statusLabel(item.status)}
              </AdminStatusMessage>
            </div>
            <div class="flex items-center gap-2">
              <div class="h-2 flex-1 overflow-hidden rounded bg-surface-muted">
                <div
                  class={`h-full transition-all ${uploadBarClasses(item.status)}`}
                  style={`width: ${item.progressPct}%;`}
                ></div>
              </div>
              <span class="w-12 text-right text-xs text-text-muted tabular-nums"
                >{item.progressPct}%</span
              >
            </div>
            {#if item.message}
              <p
                class={`text-xs ${item.status === 'error' ? 'text-danger' : 'text-text-muted'}`}
              >
                {item.message}
              </p>
            {/if}
          </AdminCard>
        {/each}
      </section>
    {/if}
  </div>
{/snippet}

{#snippet uploadPanel()}
  <div class="grid gap-4 lg:max-w-md">
    <section class="flex flex-col gap-4">
      <input
        {@attach uploader.setFileInput}
        type="file"
        accept={uploader.acceptedTypes}
        multiple
        class="sr-only"
        aria-label="Choose image files"
        onchange={(e) => {
          const input = e.currentTarget as HTMLInputElement;
          uploader.onFiles(input.files);
          input.value = '';
        }}
      />
      <button
        type="button"
        disabled={uploader.uploading}
        onclick={uploader.browse}
        ondragover={uploader.onDragOver}
        ondragleave={uploader.onDragLeave}
        ondrop={uploader.onDrop}
        class="flex min-h-[120px] flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed py-8 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-60 {uploader.dragOver
          ? 'border-brand bg-brand-contrast/30'
          : 'border-border-strong bg-surface hover:border-border hover:bg-surface-muted'}"
      >
        <svg
          class="size-12 text-text-muted"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
          <polyline points="7 9 12 4 17 9" />
          <line x1="12" y1="4" x2="12" y2="16" />
        </svg>
        <span class="text-center text-sm font-medium text-text">
          {uploader.dragOver
            ? 'Drop images here'
            : 'Drop images here or click to browse'}
        </span>
        <span class="text-xs text-text-muted"> JPEG, PNG, WebP, HEIC </span>
      </button>
      <p class="text-xs text-text-muted">
        Each image creates a private draft photo with a lead image.
      </p>
      <AdminButton
        variant="submit"
        type="button"
        disabled={!uploader.canStart}
        onclick={startUploads}
      >
        {uploader.uploading ? 'Uploading…' : 'Start Upload'}
      </AdminButton>
    </section>
  </div>
{/snippet}
