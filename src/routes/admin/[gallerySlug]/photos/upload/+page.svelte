<script lang="ts">
  import { goto } from '$app/navigation';
  import { resolve } from '$app/paths';
  import { page } from '$app/state';

  import AdminCard from '$lib/components/admin/AdminCard.svelte';
  import AdminButton from '$lib/components/admin/AdminButton.svelte';
  import AdminCreateListLayout from '$lib/components/admin/AdminCreateListLayout.svelte';
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
  const ACCEPTED_EXTENSIONS = [
    '.jpg',
    '.jpeg',
    '.png',
    '.webp',
    '.heic',
    '.heif',
  ];
  const MAX_CONCURRENCY = 3;
  const basePhotosPath = $derived(
    page.url.pathname.replace(/\/upload\/?$/, ''),
  );

  let uploadQueue = $state<UploadItem[]>([]);
  let uploading = $state(false);
  let dragOver = $state(false);
  let fileInputEl = $state<HTMLInputElement | null>(null);

  function filterAcceptedFiles(files: FileList | File[]): File[] {
    const list = Array.from(files);
    return list.filter((file) => {
      if (ACCEPTED_TYPES.split(',').includes(file.type)) return true;
      const name = file.name.toLowerCase();
      return ACCEPTED_EXTENSIONS.some((ext) => name.endsWith(ext));
    });
  }

  function onFiles(files: FileList | File[] | null) {
    if (!files || files.length === 0) return;

    const accepted = filterAcceptedFiles(files);
    if (accepted.length === 0) return;

    enqueueFiles(accepted);
  }

  function onDrop(e: DragEvent) {
    e.preventDefault();
    dragOver = false;
    if (uploading) return;
    const dt = e.dataTransfer;
    if (dt?.files?.length) onFiles(dt.files);
  }

  function onDragOver(e: DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (uploading) return;
    dragOver = true;
  }

  function onDragLeave(e: DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    const el = e.currentTarget as HTMLElement | null;
    if (el && !el.contains(e.relatedTarget as Node)) dragOver = false;
  }

  function browse() {
    if (uploading || !fileInputEl) return;
    fileInputEl.click();
  }

  const setFileInput = (node: HTMLInputElement) => {
    fileInputEl = node;
    return () => {
      if (fileInputEl === node) fileInputEl = null;
    };
  };

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

  function enqueueFiles(files: File[]) {
    const next: UploadItem[] = files.map((file) => ({
      id: makeId(),
      file,
      displayName: file.name,
      status: 'queued',
      progressPct: 0,
      message: null,
      photoId: null,
    }));

    uploadQueue = [...uploadQueue, ...next];
  }

  function uploadOne(item: UploadItem): Promise<void> {
    return new Promise((done) => {
      const xhr = new XMLHttpRequest();
      const postUrl = `${page.url.pathname.replace(/\/$/, '')}`;
      xhr.open('POST', postUrl);
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
          done();
          return;
        }

        item.status = 'error';
        item.message = payload?.message ?? `Upload failed (${xhr.status}).`;
        done();
      });

      xhr.addEventListener('error', () => {
        item.status = 'error';
        item.message = 'Network error while uploading.';
        done();
      });

      xhr.addEventListener('abort', () => {
        item.status = 'error';
        item.message = 'Upload canceled.';
        done();
      });

      xhr.addEventListener('timeout', () => {
        item.status = 'error';
        item.message = 'Upload timed out.';
        done();
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

    const isSingleUpload = uploadQueue.length === 1;
    uploading = true;
    const workerCount = Math.min(MAX_CONCURRENCY, queuedCount);
    const workers = Array.from({ length: workerCount }, () => runWorker());
    await Promise.all(workers);
    uploading = false;

    if (isSingleUpload) {
      const singleItem = uploadQueue[0];
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
  <a
    href={resolve(basePhotosPath as `/${string}`)}
    class="-m-2 p-2 text-text-muted transition-colors hover:text-brand"
    aria-label="Back to {data.gallery.name}"
  >
    <svg
      class="size-4"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      <path d="M10 3 5 8l5 5" />
    </svg>
  </a>
{/snippet}

{#snippet uploadQueuePanel()}
  <div class="grid gap-4">
    <div
      class="flex min-w-0 flex-wrap gap-4 rounded border border-border bg-surface-muted p-3 text-xs"
    >
      <p>Total: <span class="font-medium">{totalCount}</span></p>
      <p>Queued: <span class="font-medium">{queuedCount}</span></p>
      <p>Uploading: <span class="font-medium">{uploadingCount}</span></p>
      <p>
        Success: <span class="font-medium text-success">{successCount}</span>
      </p>
      <p>Failed: <span class="font-medium text-danger">{errorCount}</span></p>
    </div>

    {#if uploadQueue.length === 0}
      <p class="text-sm text-text-muted">Select images to begin uploading.</p>
    {:else}
      <section class="grid gap-2">
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
      </section>
    {/if}
  </div>
{/snippet}

{#snippet uploadPanel()}
  <div class="grid gap-4 lg:max-w-md">
    <section class="flex flex-col gap-4">
      <input
        {@attach setFileInput}
        type="file"
        accept={ACCEPTED_TYPES}
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
        disabled={uploading}
        onclick={browse}
        ondragover={onDragOver}
        ondragleave={onDragLeave}
        ondrop={onDrop}
        class="flex min-h-[120px] flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed py-8 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-60 {dragOver
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
          {dragOver
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
        disabled={!canStart}
        onclick={startUploads}
      >
        {uploading ? 'Uploading…' : 'Start Upload'}
      </AdminButton>
    </section>
  </div>
{/snippet}
