<script lang="ts">
  import { goto } from '$app/navigation';
  import { resolve } from '$app/paths';
  import { page } from '$app/state';

  import AdminCard from '$lib/components/admin/AdminCard.svelte';
  import AdminButton from '$lib/components/admin/AdminButton.svelte';
  import AdminHeading from '$lib/components/admin/AdminHeading.svelte';
  import AdminStatusMessage from '$lib/components/admin/AdminStatusMessage.svelte';

  type UploadStatus = 'queued' | 'uploading' | 'success' | 'error';

  type UploadItem = {
    id: string;
    file: File;
    displayName: string;
    status: UploadStatus;
    progressPct: number;
    message: string | null;
    photoId: string | null;
  };

  type UploadResponse = {
    success: boolean;
    message?: string;
    photoId?: string;
  } | null;

  const { data } = $props();

  const ACCEPTED_TYPES =
    'image/jpeg,image/png,image/webp,image/heic,image/heif';
  const MAX_CONCURRENCY = 3;
  const basePhotosPath = $derived(
    page.url.pathname.replace(/\/multiple\/?$/, ''),
  );

  let uploadQueue = $state<UploadItem[]>([]);
  let uploading = $state(false);

  const totalCount = $derived(uploadQueue.length);
  const uploadingCount = $derived(
    uploadQueue.filter((item) => item.status === 'uploading').length,
  );
  const successCount = $derived(
    uploadQueue.filter((item) => item.status === 'success').length,
  );
  const errorCount = $derived(
    uploadQueue.filter((item) => item.status === 'error').length,
  );
  const queuedCount = $derived(
    uploadQueue.filter((item) => item.status === 'queued').length,
  );
  const canStart = $derived(!uploading && queuedCount > 0);

  const makeId = () => {
    if (
      typeof crypto !== 'undefined' &&
      typeof crypto.randomUUID === 'function'
    ) {
      return crypto.randomUUID();
    }
    return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  };

  const statusLabel = (status: UploadStatus) => {
    if (status === 'queued') return 'Queued';
    if (status === 'uploading') return 'Uploading';
    if (status === 'success') return 'Complete';
    return 'Failed';
  };

  const barClasses = (status: UploadStatus) => {
    if (status === 'success') return 'bg-success';
    if (status === 'error') return 'bg-danger';
    return 'bg-info';
  };

  const parseResponse = (payload: string): UploadResponse => {
    try {
      const parsed = JSON.parse(payload) as Record<string, unknown>;
      if (
        typeof parsed !== 'object' ||
        parsed === null ||
        typeof parsed.success !== 'boolean'
      )
        return null;
      return {
        success: parsed.success,
        message:
          typeof parsed.message === 'string' ? parsed.message : undefined,
        photoId:
          typeof parsed.photoId === 'string' ? parsed.photoId : undefined,
      };
    } catch {
      return null;
    }
  };

  function setFiles(files: FileList | null) {
    if (!files || files.length === 0) {
      uploadQueue = [];
      return;
    }

    uploadQueue = Array.from(files).map((file) => ({
      id: makeId(),
      file,
      displayName: file.name,
      status: 'queued',
      progressPct: 0,
      message: null,
      photoId: null,
    }));
  }

  function uploadOne(item: UploadItem): Promise<void> {
    return new Promise((resolve) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', `${page.url.pathname.replace(/\/$/, '')}/upload`);
      xhr.timeout = 120_000;

      xhr.upload.addEventListener('loadstart', () => {
        item.status = 'uploading';
        item.progressPct = Math.max(item.progressPct, 1);
        item.message = null;
      });

      xhr.upload.addEventListener('progress', (event) => {
        if (!event.lengthComputable) return;
        item.progressPct = Math.max(
          1,
          Math.min(99, Math.round((event.loaded / event.total) * 100)),
        );
      });

      xhr.addEventListener('load', () => {
        const payload = parseResponse(xhr.responseText);
        if (xhr.status >= 200 && xhr.status < 300 && payload?.success) {
          item.status = 'success';
          item.progressPct = 100;
          item.photoId = payload.photoId ?? null;
          item.message = payload.message ?? 'Image uploaded.';
          resolve();
          return;
        }

        item.status = 'error';
        item.message = payload?.message ?? `Upload failed (${xhr.status}).`;
        resolve();
      });

      xhr.addEventListener('error', () => {
        item.status = 'error';
        item.message = 'Network error while uploading.';
        resolve();
      });

      xhr.addEventListener('abort', () => {
        item.status = 'error';
        item.message = 'Upload canceled.';
        resolve();
      });

      xhr.addEventListener('timeout', () => {
        item.status = 'error';
        item.message = 'Upload timed out.';
        resolve();
      });

      const formData = new FormData();
      formData.set('image_file', item.file);
      xhr.send(formData);
    });
  }

  async function runWorker() {
    while (true) {
      const nextItem = uploadQueue.find((item) => item.status === 'queued');
      if (!nextItem) return;

      nextItem.status = 'uploading';
      nextItem.progressPct = 0;
      await uploadOne(nextItem);
    }
  }

  async function startUploads() {
    if (!canStart) return;

    uploading = true;
    const workerCount = Math.min(MAX_CONCURRENCY, queuedCount);
    const workers = Array.from({ length: workerCount }, () => runWorker());
    await Promise.all(workers);
    uploading = false;
    await goto(resolve(basePhotosPath as `/${string}`));
  }
</script>

<div class="flex flex-wrap items-center justify-between gap-3">
  <AdminHeading>Bulk Upload /{data.gallery.slug}</AdminHeading>
  <AdminButton href={basePhotosPath}>Back to Photos</AdminButton>
</div>

<p class="mt-2 text-sm text-text-muted">
  Upload multiple images at once. Each image creates one private draft photo
  with a lead image.
</p>

<AdminCard as="section" class="mt-6 grid gap-4 p-4">
  <div class="grid gap-2">
    <p class="text-xs tracking-widest uppercase">Choose Images</p>
    <input
      type="file"
      accept={ACCEPTED_TYPES}
      multiple
      disabled={uploading}
      onchange={(event) =>
        setFiles((event.currentTarget as HTMLInputElement).files)}
      class="w-full rounded border border-border-strong bg-surface px-3 py-2 text-sm"
    />
    <p class="text-xs text-text-muted">
      {#if totalCount === 0}
        No files selected.
      {:else}
        Selected {totalCount} file(s).
      {/if}
    </p>
  </div>

  <div class="flex flex-wrap items-center gap-2">
    <AdminButton
      variant="submit"
      type="button"
      disabled={!canStart}
      onclick={startUploads}
    >
      {uploading ? 'Uploading…' : 'Start Upload'}
    </AdminButton>
    <span class="text-xs text-text-muted">
      Max {MAX_CONCURRENCY} parallel uploads
    </span>
  </div>

  <div
    class="grid gap-2 rounded border border-border bg-surface-muted p-3 text-xs sm:grid-cols-5"
  >
    <p>Total: <span class="font-medium">{totalCount}</span></p>
    <p>Queued: <span class="font-medium">{queuedCount}</span></p>
    <p>Uploading: <span class="font-medium">{uploadingCount}</span></p>
    <p>Success: <span class="font-medium text-success">{successCount}</span></p>
    <p>Failed: <span class="font-medium text-danger">{errorCount}</span></p>
  </div>
</AdminCard>

<section class="mt-6 grid gap-2">
  {#if uploadQueue.length === 0}
    <p
      class="rounded border border-border bg-surface p-3 text-sm text-text-muted"
    >
      Select images to build the upload queue.
    </p>
  {:else}
    {#each uploadQueue as item (item.id)}
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
              class={`h-full transition-all ${barClasses(item.status)}`}
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
  {/if}
</section>
