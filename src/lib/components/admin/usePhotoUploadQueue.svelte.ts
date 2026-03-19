const PHOTO_UPLOAD_ACCEPTED_TYPES =
  'image/jpeg,image/png,image/webp,image/heic,image/heif';

const PHOTO_UPLOAD_ACCEPTED_EXTENSIONS = [
  '.jpg',
  '.jpeg',
  '.png',
  '.webp',
  '.heic',
  '.heif',
] as const;

type UploadStatus = 'queued' | 'uploading' | 'success' | 'error';

type UploadQueueItem<TExtra extends Record<string, unknown>> = TExtra & {
  id: string;
  file: File;
  displayName: string;
  status: UploadStatus;
  progressPct: number;
  message: string | null;
};

type UploadBatchResult<TExtra extends Record<string, unknown>> = {
  items: Array<UploadQueueItem<TExtra>>;
  totalCount: number;
  queuedCount: number;
  uploadingCount: number;
  successCount: number;
  errorCount: number;
};

type UploadResponse<TData> = {
  success: boolean;
  message?: string;
  data: TData | null;
} | null;

type UsePhotoUploadQueueOptions<
  TData,
  TExtra extends Record<string, unknown>,
> = {
  autoStart?: boolean;
  buildFormData: (item: UploadQueueItem<TExtra>) => FormData;
  createItemExtra?: (file: File) => TExtra;
  getPostUrl: () => string;
  maxConcurrency?: number;
  onBatchComplete?: (result: UploadBatchResult<TExtra>) => Promise<void> | void;
  onUploadSuccess?: (item: UploadQueueItem<TExtra>, data: TData | null) => void;
  parseSuccessData?: (parsed: Record<string, unknown>) => TData | null;
};

const DEFAULT_MAX_CONCURRENCY = 3;

const makeId = () => {
  if (
    typeof globalThis.crypto !== 'undefined' &&
    typeof globalThis.crypto.randomUUID === 'function'
  ) {
    return globalThis.crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
};

const parseResponse = <TData>(
  payload: string,
  parseSuccessData?: (parsed: Record<string, unknown>) => TData | null,
): UploadResponse<TData> => {
  try {
    const parsed = JSON.parse(payload) as Record<string, unknown>;
    if (
      typeof parsed !== 'object' ||
      parsed === null ||
      typeof parsed.success !== 'boolean'
    ) {
      return null;
    }

    return {
      success: parsed.success,
      message: typeof parsed.message === 'string' ? parsed.message : undefined,
      data: parseSuccessData?.(parsed) ?? null,
    };
  } catch {
    return null;
  }
};

const filterAcceptedFiles = (files: FileList | File[]) => {
  const list = Array.from(files);

  return list.filter((file) => {
    if (PHOTO_UPLOAD_ACCEPTED_TYPES.split(',').includes(file.type)) {
      return true;
    }

    const name = file.name.toLowerCase();
    return PHOTO_UPLOAD_ACCEPTED_EXTENSIONS.some((ext) => name.endsWith(ext));
  });
};

export const statusLabel = (status: UploadStatus) => {
  if (status === 'queued') return 'Queued';
  if (status === 'uploading') return 'Uploading';
  if (status === 'success') return 'Complete';
  return 'Failed';
};

export const uploadBarClasses = (status: UploadStatus) => {
  if (status === 'success') return 'bg-success';
  if (status === 'error') return 'bg-danger';
  return 'bg-info';
};

export const usePhotoUploadQueue = <
  TData = never,
  TExtra extends Record<string, unknown> = Record<string, never>,
>({
  autoStart = false,
  buildFormData,
  createItemExtra,
  getPostUrl,
  maxConcurrency = DEFAULT_MAX_CONCURRENCY,
  onBatchComplete,
  onUploadSuccess,
  parseSuccessData,
}: UsePhotoUploadQueueOptions<TData, TExtra>) => {
  let uploadQueue = $state<Array<UploadQueueItem<TExtra>>>([]);
  let uploading = $state(false);
  let dragOver = $state(false);
  let fileInputEl = $state<HTMLInputElement | null>(null);

  const totalCount = $derived(uploadQueue.length);
  const queuedCount = $derived(
    uploadQueue.filter((item) => item.status === 'queued').length,
  );
  const uploadingCount = $derived(
    uploadQueue.filter((item) => item.status === 'uploading').length,
  );
  const successCount = $derived(
    uploadQueue.filter((item) => item.status === 'success').length,
  );
  const errorCount = $derived(
    uploadQueue.filter((item) => item.status === 'error').length,
  );
  const canStart = $derived(!uploading && queuedCount > 0);

  const createResult = (): UploadBatchResult<TExtra> => ({
    items: uploadQueue,
    totalCount,
    queuedCount,
    uploadingCount,
    successCount,
    errorCount,
  });

  const enqueueFiles = (files: File[]) => {
    const nextItems = files.map(
      (file): UploadQueueItem<TExtra> => ({
        id: makeId(),
        file,
        displayName: file.name,
        status: 'queued',
        progressPct: 0,
        message: null,
        ...(createItemExtra?.(file) ?? ({} as TExtra)),
      }),
    );

    uploadQueue = [...uploadQueue, ...nextItems];
  };

  const uploadOne = (item: UploadQueueItem<TExtra>): Promise<void> =>
    new Promise((done) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', getPostUrl().replace(/\/$/, ''));
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
        const payload = parseResponse(xhr.responseText, parseSuccessData);
        if (xhr.status >= 200 && xhr.status < 300 && payload?.success) {
          item.status = 'success';
          item.progressPct = 100;
          item.message = payload.message ?? 'Image uploaded.';
          onUploadSuccess?.(item, payload.data);
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

      xhr.send(buildFormData(item));
    });

  const runWorker = async () => {
    while (true) {
      const nextItem = uploadQueue.find((item) => item.status === 'queued');
      if (!nextItem) return;

      nextItem.status = 'uploading';
      nextItem.progressPct = 0;
      await uploadOne(nextItem);
    }
  };

  const startUploads = async () => {
    if (!canStart) return null;

    uploading = true;
    const workerCount = Math.min(maxConcurrency, queuedCount);
    const workers = Array.from({ length: workerCount }, () => runWorker());
    await Promise.all(workers);
    uploading = false;

    const result = createResult();
    await onBatchComplete?.(result);
    return result;
  };

  const clearQueue = () => {
    uploadQueue = [];
  };

  const onFiles = (files: FileList | File[] | null) => {
    if (!files || files.length === 0) return;

    const accepted = filterAcceptedFiles(files);
    if (accepted.length === 0) return;

    enqueueFiles(accepted);
    if (autoStart) {
      void startUploads();
    }
  };

  const onDrop = (event: DragEvent) => {
    event.preventDefault();
    dragOver = false;
    if (uploading) return;

    const dt = event.dataTransfer;
    if (dt?.files?.length) {
      onFiles(dt.files);
    }
  };

  const onDragOver = (event: DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    if (uploading) return;

    dragOver = true;
  };

  const onDragLeave = (event: DragEvent) => {
    event.preventDefault();
    event.stopPropagation();

    const el = event.currentTarget as HTMLElement | null;
    if (el && !el.contains(event.relatedTarget as Node)) {
      dragOver = false;
    }
  };

  const browse = () => {
    if (uploading || !fileInputEl) return;
    fileInputEl.click();
  };

  const setFileInput = (node: HTMLInputElement) => {
    fileInputEl = node;

    return () => {
      if (fileInputEl === node) {
        fileInputEl = null;
      }
    };
  };

  return {
    acceptedTypes: PHOTO_UPLOAD_ACCEPTED_TYPES,
    browse,
    clearQueue,
    get canStart() {
      return canStart;
    },
    get dragOver() {
      return dragOver;
    },
    get errorCount() {
      return errorCount;
    },
    get queuedCount() {
      return queuedCount;
    },
    get successCount() {
      return successCount;
    },
    get totalCount() {
      return totalCount;
    },
    get uploadQueue() {
      return uploadQueue;
    },
    get uploading() {
      return uploading;
    },
    get uploadingCount() {
      return uploadingCount;
    },
    onDragLeave,
    onDragOver,
    onDrop,
    onFiles,
    setFileInput,
    startUploads,
  };
};
