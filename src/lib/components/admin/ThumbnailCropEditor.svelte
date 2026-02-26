<script lang="ts">
  import { photoPublicUrl } from '$lib/utils/storage-url';

  type ThumbCrop = {
    thumb_crop_x: number | null;
    thumb_crop_y: number | null;
    thumb_crop_zoom: number | null;
  };

  let {
    imageId,
    deliveryStoragePath,
    altText,
    widthPx = null,
    heightPx = null,
    initialCrop = null,
    photoId
  } = $props<{
    imageId: string;
    deliveryStoragePath: string;
    altText: string | null;
    widthPx?: number | null;
    heightPx?: number | null;
    initialCrop?: ThumbCrop | null;
    photoId: string;
  }>();

  const EDITOR_SIZE = 360;
  const ZOOM_MIN = 1;
  const ZOOM_MAX = 4;
  const ZOOM_STEP = 0.1;

  const initialX = $derived(initialCrop?.thumb_crop_x ?? 0.5);
  const initialY = $derived(initialCrop?.thumb_crop_y ?? 0.5);
  const initialZoom = $derived(initialCrop?.thumb_crop_zoom ?? 1);

  let cropX = $state(0.5);
  let cropY = $state(0.5);
  let cropZoom = $state(1);

  let prevInitialKey = $state('');
  $effect(() => {
    const key = `${initialX}_${initialY}_${initialZoom}`;
    if (key !== prevInitialKey) {
      prevInitialKey = key;
      cropX = initialX;
      cropY = initialY;
      cropZoom = initialZoom;
    }
  });

  let imgNaturalWidth = $state<number | null>(null);
  let imgNaturalHeight = $state<number | null>(null);
  let containerRef = $state<HTMLDivElement | null>(null);
  let imgRef = $state<HTMLImageElement | null>(null);
  let isDragging = $state(false);
  let dragStartX = 0;
  let dragStartY = 0;
  let dragStartCropX = 0;
  let dragStartCropY = 0;

  const imgWidth = $derived(imgNaturalWidth ?? widthPx ?? 1);
  const imgHeight = $derived(imgNaturalHeight ?? heightPx ?? 1);
  const imgAspect = $derived(imgWidth / imgHeight);

  // Image display rect when contained in EDITOR_SIZE x EDITOR_SIZE
  const containedRect = $derived.by(() => {
    if (imgAspect >= 1) {
      const w = EDITOR_SIZE;
      const h = EDITOR_SIZE / imgAspect;
      return { left: 0, top: (EDITOR_SIZE - h) / 2, width: w, height: h };
    }
    const h = EDITOR_SIZE;
    const w = EDITOR_SIZE * imgAspect;
    return { left: (EDITOR_SIZE - w) / 2, top: 0, width: w, height: h };
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
      height: size
    };
  });

  const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

  const onImgLoad = (e: Event) => {
    const img = e.target as HTMLImageElement;
    if (img?.naturalWidth && img?.naturalHeight) {
      imgNaturalWidth = img.naturalWidth;
      imgNaturalHeight = img.naturalHeight;
    }
  };

  const containerToNorm = (clientX: number, clientY: number) => {
    if (!containerRef) return { x: 0.5, y: 0.5 };
    const rect = containerRef.getBoundingClientRect();
    const r = containedRect;
    const px = clientX - rect.left - r.left;
    const py = clientY - rect.top - r.top;
    const nx = px / r.width;
    const ny = py / r.height;
    return { x: clamp(nx, 0, 1), y: clamp(ny, 0, 1) };
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
    const normDx = dx / r.width;
    const normDy = dy / r.height;
    cropX = clamp(dragStartCropX + normDx, cropSideNormX / 2, 1 - cropSideNormX / 2);
    cropY = clamp(dragStartCropY + normDy, cropSideNormY / 2, 1 - cropSideNormY / 2);
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
      initialCrop?.thumb_crop_zoom != null
  );
  const hasChanges = $derived(
    cropX !== (initialCrop?.thumb_crop_x ?? 0.5) ||
      cropY !== (initialCrop?.thumb_crop_y ?? 0.5) ||
      cropZoom !== (initialCrop?.thumb_crop_zoom ?? 1)
  );
</script>

<div class="grid gap-3">
  <p class="text-xs uppercase tracking-[0.12em]">Thumbnail crop (grid square)</p>

  <div
    bind:this={containerRef}
    class="relative overflow-hidden rounded border border-border-strong bg-surface-muted"
    style="width: {EDITOR_SIZE}px; height: {EDITOR_SIZE}px"
    role="img"
    aria-label="Thumbnail crop editor"
    onpointerdown={onPointerDown}
    onpointermove={onPointerMove}
    onpointerup={onPointerUp}
    onpointercancel={onPointerUp}
    onpointerleave={onPointerUp}
  >
    <img
      bind:this={imgRef}
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
      <span class="uppercase tracking-[0.12em]">Zoom</span>
      <input
        type="range"
        min={ZOOM_MIN}
        max={ZOOM_MAX}
        step={ZOOM_STEP}
        bind:value={cropZoom}
        class="w-24"
      />
      <span class="tabular-nums">{cropZoom.toFixed(1)}x</span>
    </label>
    <button
      type="button"
      class="rounded border border-border-strong px-2 py-1 text-xs uppercase tracking-[0.12em]"
      onclick={resetToDefault}
    >
      Reset to default
    </button>
  </div>

  <form method="POST" action="?/saveThumbCrop" class="flex flex-wrap items-center gap-2">
    <input type="hidden" name="photo_id" value={photoId} />
    <input type="hidden" name="image_id" value={imageId} />
    <input type="hidden" name="thumb_crop_x" value={cropX} />
    <input type="hidden" name="thumb_crop_y" value={cropY} />
    <input type="hidden" name="thumb_crop_zoom" value={cropZoom} />
    <button
      type="submit"
      class="rounded border border-border-strong px-3 py-1 text-xs uppercase tracking-[0.14em] disabled:opacity-50"
      disabled={!hasChanges}
    >
      Save thumbnail crop
    </button>
  </form>

  {#if hasCustomCrop}
    <form method="POST" action="?/clearThumbCrop" class="inline">
      <input type="hidden" name="photo_id" value={photoId} />
      <input type="hidden" name="image_id" value={imageId} />
      <button type="submit" class="text-xs text-text-muted underline">
        Clear custom crop (use default)
      </button>
    </form>
  {/if}
</div>
