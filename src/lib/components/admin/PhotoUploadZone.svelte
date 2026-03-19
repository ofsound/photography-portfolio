<script lang="ts">
  import { invalidateAll } from '$app/navigation';
  import { page } from '$app/state';

  import AdminCard from '$lib/components/admin/AdminCard.svelte';
  import AdminHeading from '$lib/components/admin/AdminHeading.svelte';
  import AdminStatusMessage from '$lib/components/admin/AdminStatusMessage.svelte';
  import {
    statusLabel,
    uploadBarClasses,
    usePhotoUploadQueue,
  } from '$lib/components/admin/usePhotoUploadQueue.svelte';

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
  let doneMessage = $state<string | null>(null);

  const uploader = usePhotoUploadQueue({
    autoStart: true,
    buildFormData: (item) => {
      const formData = new FormData();
      formData.set('photo_id', photoId);
      if (galleryId) formData.set('gallery_id', galleryId);
      formData.set('draft_title', draftTitle);
      formData.set('draft_slug', draftSlug);
      formData.set('image_file', item.file);
      return formData;
    },
    getPostUrl: () => page.url.pathname,
    onBatchComplete: async (result) => {
      await invalidateAll();

      const ok = result.successCount;
      const failed = result.errorCount;
      if (failed === 0) {
        doneMessage = `${ok} image${ok === 1 ? '' : 's'} uploaded successfully.`;
      } else {
        doneMessage = `${ok} uploaded, ${failed} failed.`;
      }

      uploader.clearQueue();
    },
  });

  function onFiles(files: FileList | File[] | null) {
    doneMessage = null;
    uploader.onFiles(files);
  }

  function onDrop(event: DragEvent) {
    doneMessage = null;
    uploader.onDrop(event);
  }
</script>

<AdminCard variant="upload-dashed" class="grid gap-4 p-4">
  <AdminHeading level={3}>Upload Additional Images</AdminHeading>

  <input
    {@attach uploader.setFileInput}
    type="file"
    accept={uploader.acceptedTypes}
    multiple
    class="sr-only"
    aria-label="Choose image files"
    onchange={(e) => {
      const input = e.currentTarget as HTMLInputElement;
      onFiles(input.files);
      input.value = '';
    }}
  />

  <button
    type="button"
    disabled={uploader.uploading}
    onclick={uploader.browse}
    ondragover={uploader.onDragOver}
    ondragleave={uploader.onDragLeave}
    ondrop={onDrop}
    class="flex min-h-30 flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed py-8 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-60 {uploader.dragOver
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
    <span class="text-xs text-text-muted">JPEG, PNG, WebP, HEIC</span>
  </button>

  {#if doneMessage}
    <p class="text-center text-sm text-success">{doneMessage}</p>
  {/if}

  {#if uploader.uploadQueue.length > 0}
    <div class="grid gap-3">
      <div
        class="flex min-w-0 flex-wrap gap-3 rounded border border-border bg-surface-muted p-2 text-xs"
      >
        <p>Total: <span class="font-medium">{uploader.totalCount}</span></p>
        <p>Queued: <span class="font-medium">{uploader.queuedCount}</span></p>
        <p>
          Uploading: <span class="font-medium">{uploader.uploadingCount}</span>
        </p>
        <p>
          Done: <span class="font-medium text-success"
            >{uploader.successCount}</span
          >
        </p>
        {#if uploader.errorCount > 0}
          <p>
            Failed: <span class="font-medium text-danger"
              >{uploader.errorCount}</span
            >
          </p>
        {/if}
      </div>

      <section class="grid gap-2">
        {#each uploader.uploadQueue as item (item.id)}
          <div class="grid gap-1.5 rounded border border-border bg-surface p-2">
            <div class="flex items-center justify-between gap-2">
              <p class="min-w-0 flex-1 truncate text-xs">{item.displayName}</p>
              <AdminStatusMessage
                type={item.status === 'success'
                  ? 'success'
                  : item.status === 'error'
                    ? 'error'
                    : 'neutral'}
                class="px-1.5 py-0.5 text-xs"
              >
                {statusLabel(item.status)}
              </AdminStatusMessage>
            </div>
            <div class="flex items-center gap-2">
              <div
                class="h-1.5 flex-1 overflow-hidden rounded bg-surface-muted"
              >
                <div
                  class={`h-full transition-all ${uploadBarClasses(item.status)}`}
                  style={`width: ${item.progressPct}%;`}
                ></div>
              </div>
              <span class="w-10 text-right text-xs text-text-muted tabular-nums"
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
          </div>
        {/each}
      </section>
    </div>
  {/if}
</AdminCard>
