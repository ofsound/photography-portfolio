<script lang="ts">
  import { enhance } from '$app/forms';
  import AdminButton from '$lib/components/admin/AdminButton.svelte';
  import { parseDimensions } from '$lib/utils/parse-dimensions';
  import { photoPublicUrl } from '$lib/utils/storage-url';

  type ThumbCrop = {
    thumb_crop_x: number | null;
    thumb_crop_y: number | null;
    thumb_crop_zoom: number | null;
  };

  const {
    imageId,
    deliveryStoragePath,
    altText,
    dimensions = null,
    initialCrop = null,
    photoId,
    galleryId = '',
  } = $props<{
    imageId: string;
    deliveryStoragePath: string;
    sourceStoragePath?: string | null;
    altText: string | null;
    dimensions?: string | null;
    initialCrop?: ThumbCrop | null;
    photoId: string;
    galleryId?: string;
  }>();

  const parsedDims = $derived(parseDimensions(dimensions));

  const EDITOR_MAX_SIZE = 360;
  const ZOOM_MIN = 1;
  const ZOOM_MAX = 4;
  const ZOOM_STEP = 0.1;

  const initialX = $derived(initialCrop?.thumb_crop_x ?? 0.5);
  const initialY = $derived(initialCrop?.thumb_crop_y ?? 0.5);
  const initialZoom = $derived(initialCrop?.thumb_crop_zoom ?? 1);
  const getInitialX = () => initialX;
  const getInitialY = () => initialY;
  const getInitialZoom = () => initialZoom;

  let cropX = $state(getInitialX());
  let cropY = $state(getInitialY());
  let cropZoom = $state(getInitialZoom());

  let imgNaturalWidth = $state<number | null>(null);
  let imgNaturalHeight = $state<number | null>(null);
  let editorClientWidth = $state(EDITOR_MAX_SIZE);
  let isDragging = $state(false);
  let dragStartX = 0;
  let dragStartY = 0;
  let dragStartCropX = 0;
  let dragStartCropY = 0;

  const imgWidth = $derived(imgNaturalWidth ?? parsedDims?.width ?? 1);
  const imgHeight = $derived(imgNaturalHeight ?? parsedDims?.height ?? 1);
  const imgAspect = $derived(imgWidth / imgHeight);
  const editorSize = $derived(
    Math.min(EDITOR_MAX_SIZE, Math.max(editorClientWidth, 1)),
  );

  // Image display rect when contained in the rendered editor square
  const containedRect = $derived.by(() => {
    const size = editorSize;
    if (imgAspect >= 1) {
      const w = size;
      const h = size / imgAspect;
      return { left: 0, top: (size - h) / 2, width: w, height: h };
    }
    const h = size;
    const w = size * imgAspect;
    return { left: (size - w) / 2, top: 0, width: w, height: h };
  });

  // Crop square side in image pixels: at zoom=1, it's min(W,H) (fit). At zoom=2, half.
  const cropSideImagePx = $derived(Math.min(imgWidth, imgHeight) / cropZoom);
  const cropSideNormX = $derived(cropSideImagePx / imgWidth);
  const cropSideNormY = $derived(cropSideImagePx / imgHeight);

  // Crop rect in container pixels (over the contained image)
  const cropOverlayRect = $derived.by(() => {
    const r = containedRect;
    const cxNorm = cropX;
    const cyNorm = cropY;
    const halfW = cropSideNormX / 2;
    const halfH = cropSideNormY / 2;
    const size = Math.min(cropSideNormX * r.width, cropSideNormY * r.height);
    return {
      left: r.left + (cxNorm - halfW) * r.width,
      top: r.top + (cyNorm - halfH) * r.height,
      width: size,
      height: size,
    };
  });

  const clamp = (v: number, min: number, max: number) =>
    Math.max(min, Math.min(max, v));

  const onImgLoad = (e: Event) => {
    const img = e.target as HTMLImageElement;
    if (img?.naturalWidth && img?.naturalHeight) {
      imgNaturalWidth = img.naturalWidth;
      imgNaturalHeight = img.naturalHeight;
    }
  };

  const onPointerDown = (e: PointerEvent) => {
    if (!(e.target as HTMLElement).closest('[data-crop-overlay]')) return;
    e.preventDefault();
    isDragging = true;
    dragStartX = e.clientX;
    dragStartY = e.clientY;
    dragStartCropX = cropX;
    dragStartCropY = cropY;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: PointerEvent) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStartX;
    const dy = e.clientY - dragStartY;
    const r = containedRect;
    if (r.width <= 0 || r.height <= 0) return;
    const normDx = dx / r.width;
    const normDy = dy / r.height;
    cropX = clamp(
      dragStartCropX + normDx,
      cropSideNormX / 2,
      1 - cropSideNormX / 2,
    );
    cropY = clamp(
      dragStartCropY + normDy,
      cropSideNormY / 2,
      1 - cropSideNormY / 2,
    );
    scheduleSave();
  };

  const onPointerUp = (e: PointerEvent) => {
    if (isDragging) {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
      isDragging = false;
    }
  };

  const resetToDefault = () => {
    cropX = 0.5;
    cropY = 0.5;
    cropZoom = 1;
  };

  const hasCustomCrop = $derived(
    initialCrop?.thumb_crop_x != null ||
      initialCrop?.thumb_crop_y != null ||
      initialCrop?.thumb_crop_zoom != null,
  );
  const hasChanges = $derived(
    cropX !== (initialCrop?.thumb_crop_x ?? 0.5) ||
      cropY !== (initialCrop?.thumb_crop_y ?? 0.5) ||
      cropZoom !== (initialCrop?.thumb_crop_zoom ?? 1),
  );

  let isSaving = $state(false);
  let saveFormElement: HTMLFormElement | null = null;

  const attachSaveForm = (node: HTMLFormElement) => {
    saveFormElement = node;
    return () => {
      saveFormElement = null;
    };
  };

  const scheduleSave = (() => {
    let timeout: ReturnType<typeof setTimeout>;
    return () => {
      if (timeout) clearTimeout(timeout);
      timeout = setTimeout(() => {
        if (saveFormElement && hasChanges) {
          saveFormElement.requestSubmit();
        }
      }, 800);
    };
  })();
</script>

<div class="grid gap-3">
  {#if isSaving}
    <div class="flex items-center justify-end">
      <span
        class="animate-pulse text-[10px] font-medium tracking-widest text-text-muted uppercase"
        >Saving...</span
      >
    </div>
  {/if}

  <div
    bind:clientWidth={editorClientWidth}
    class="relative aspect-square w-full max-w-[360px] overflow-hidden rounded border border-border-strong bg-surface-muted"
    role="img"
    aria-label="Thumbnail crop editor"
    onpointerdown={onPointerDown}
    onpointermove={onPointerMove}
    onpointerup={onPointerUp}
    onpointercancel={onPointerUp}
    onpointerleave={onPointerUp}
  >
    <img
      src={photoPublicUrl(deliveryStoragePath, 800)}
      alt={altText ?? ''}
      class="absolute inset-0 h-full w-full object-contain"
      onload={onImgLoad}
      draggable="false"
    />

    {#if imgNaturalWidth && imgNaturalHeight}
      <div
        data-crop-overlay
        class="absolute cursor-move border-2 border-white/90 shadow-lg ring-2 ring-black/40"
        style="left: {cropOverlayRect.left}px; top: {cropOverlayRect.top}px; width: {cropOverlayRect.width}px; height: {cropOverlayRect.height}px"
      >
        <span class="sr-only">Drag to reposition crop</span>
      </div>
    {/if}
  </div>

  <div class="flex flex-wrap items-center gap-4">
    <label class="flex items-center gap-2 text-xs">
      <span class="tracking-widest uppercase">Zoom</span>
      <input
        type="range"
        min={ZOOM_MIN}
        max={ZOOM_MAX}
        step={ZOOM_STEP}
        bind:value={cropZoom}
        oninput={scheduleSave}
        class="w-24"
      />
      <span class="tabular-nums">{cropZoom.toFixed(1)}x</span>
    </label>

    <form
      method="POST"
      action="?/clearThumbCrop"
      class="inline"
      use:enhance={() => {
        isSaving = true;
        return async ({ update }) => {
          await update();
          resetToDefault();
          isSaving = false;
        };
      }}
    >
      <input type="hidden" name="photo_id" value={photoId} />
      {#if galleryId}
        <input type="hidden" name="gallery_id" value={galleryId} />
      {/if}
      <input type="hidden" name="image_id" value={imageId} />
      <AdminButton
        size="sm"
        type="submit"
        variant="submit"
        disabled={isSaving || (!hasCustomCrop && !hasChanges)}
      >
        Reset to default
      </AdminButton>
    </form>
  </div>

  <form
    method="POST"
    action="?/saveThumbCrop"
    class="hidden"
    {@attach attachSaveForm}
    use:enhance={() => {
      isSaving = true;
      return async ({ update }) => {
        await update({ reset: false });
        isSaving = false;
      };
    }}
  >
    <input type="hidden" name="photo_id" value={photoId} />
    {#if galleryId}
      <input type="hidden" name="gallery_id" value={galleryId} />
    {/if}
    <input type="hidden" name="image_id" value={imageId} />
    <input type="hidden" name="thumb_crop_x" value={cropX} />
    <input type="hidden" name="thumb_crop_y" value={cropY} />
    <input type="hidden" name="thumb_crop_zoom" value={cropZoom} />
  </form>
</div>
