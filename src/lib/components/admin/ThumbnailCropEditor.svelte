<script lang="ts">
  import { enhance } from '$app/forms';
  import AdminButton from '$lib/components/admin/AdminButton.svelte';
  import { parseDimensions } from '$lib/utils/parse-dimensions';
  import {
    normalizeThumbCropAspect,
    thumbCropVisibleWindow,
    thumbCropTransform,
  } from '$lib/utils/thumb-crop';
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
    cropAspect,
    initialCrop = null,
    photoId,
    galleryId = '',
  } = $props<{
    imageId: string;
    deliveryStoragePath: string;
    altText: string | null;
    dimensions?: string | null;
    cropAspect: number;
    initialCrop?: ThumbCrop | null;
    photoId: string;
    galleryId?: string;
  }>();

  const EDITOR_MAX_LONG_EDGE = 360;
  const ZOOM_MIN = 1;
  const ZOOM_MAX = 4;
  const ZOOM_STEP = 0.1;

  const parsedDims = $derived(parseDimensions(dimensions));
  const safeCropAspect = $derived(normalizeThumbCropAspect(cropAspect));
  const previewMaxWidthPx = $derived(
    safeCropAspect >= 1
      ? EDITOR_MAX_LONG_EDGE
      : EDITOR_MAX_LONG_EDGE * safeCropAspect,
  );
  const previewFrameStyle = $derived(
    `aspect-ratio: ${safeCropAspect}; max-width: min(100%, ${previewMaxWidthPx}px);`,
  );

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
  let viewportClientWidth = $state(1);
  let viewportClientHeight = $state(1);
  let isDragging = $state(false);
  let dragStartX = 0;
  let dragStartY = 0;
  let dragStartCropX = 0;
  let dragStartCropY = 0;

  const imgWidth = $derived(imgNaturalWidth ?? parsedDims?.width ?? 1);
  const imgHeight = $derived(imgNaturalHeight ?? parsedDims?.height ?? 1);
  const cropWindow = $derived(
    thumbCropVisibleWindow(imgWidth, imgHeight, safeCropAspect, cropZoom),
  );
  const visibleWidthNorm = $derived(cropWindow.visibleWidthNorm);
  const visibleHeightNorm = $derived(cropWindow.visibleHeightNorm);
  const clampedCropX = $derived(
    clamp(cropX, visibleWidthNorm / 2, 1 - visibleWidthNorm / 2),
  );
  const clampedCropY = $derived(
    clamp(cropY, visibleHeightNorm / 2, 1 - visibleHeightNorm / 2),
  );
  const cropTransform = $derived(
    thumbCropTransform(
      clampedCropX,
      clampedCropY,
      cropZoom,
      imgWidth,
      imgHeight,
      safeCropAspect,
    ),
  );
  const previewImageStyle = $derived(
    `transform: translate(${cropTransform.translateX}%, ${cropTransform.translateY}%) scale(${cropTransform.scale}); transform-origin: ${cropTransform.originX * 100}% ${cropTransform.originY * 100}%;`,
  );

  function clamp(value: number, min: number, max: number) {
    return Math.max(min, Math.min(max, value));
  }

  const onImgLoad = (event: Event) => {
    const img = event.currentTarget as HTMLImageElement | null;
    if (img?.naturalWidth && img?.naturalHeight) {
      imgNaturalWidth = img.naturalWidth;
      imgNaturalHeight = img.naturalHeight;
    }
  };

  const onPointerDown = (event: PointerEvent) => {
    if (event.button !== 0 && event.pointerType !== 'touch') return;
    event.preventDefault();
    isDragging = true;
    dragStartX = event.clientX;
    dragStartY = event.clientY;
    dragStartCropX = clampedCropX;
    dragStartCropY = clampedCropY;
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
  };

  const onPointerMove = (event: PointerEvent) => {
    if (!isDragging) return;
    if (viewportClientWidth <= 0 || viewportClientHeight <= 0) return;

    const dx = event.clientX - dragStartX;
    const dy = event.clientY - dragStartY;

    cropX = clamp(
      dragStartCropX - (dx / viewportClientWidth) * visibleWidthNorm,
      visibleWidthNorm / 2,
      1 - visibleWidthNorm / 2,
    );
    cropY = clamp(
      dragStartCropY - (dy / viewportClientHeight) * visibleHeightNorm,
      visibleHeightNorm / 2,
      1 - visibleHeightNorm / 2,
    );
    scheduleSave();
  };

  const onPointerUp = (event: PointerEvent) => {
    if (!isDragging) return;
    (event.currentTarget as HTMLElement).releasePointerCapture(event.pointerId);
    isDragging = false;
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
    clampedCropX !== (initialCrop?.thumb_crop_x ?? 0.5) ||
      clampedCropY !== (initialCrop?.thumb_crop_y ?? 0.5) ||
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

  <div class="w-full">
    <div
      bind:clientWidth={viewportClientWidth}
      bind:clientHeight={viewportClientHeight}
      class="relative w-full touch-none overflow-hidden rounded border border-border-strong bg-surface-muted"
      style={previewFrameStyle}
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
        class="absolute inset-0 h-full w-full object-cover select-none"
        style={previewImageStyle}
        onload={onImgLoad}
        draggable="false"
      />

      <div
        aria-hidden="true"
        class="pointer-events-none absolute inset-0 border border-white/25"
      ></div>
      <div
        aria-hidden="true"
        class="pointer-events-none absolute inset-y-0 left-1/3 w-px bg-white/15"
      ></div>
      <div
        aria-hidden="true"
        class="pointer-events-none absolute inset-y-0 left-2/3 w-px bg-white/15"
      ></div>
      <div
        aria-hidden="true"
        class="pointer-events-none absolute inset-x-0 top-1/3 h-px bg-white/15"
      ></div>
      <div
        aria-hidden="true"
        class="pointer-events-none absolute inset-x-0 top-2/3 h-px bg-white/15"
      ></div>
    </div>
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
    <input type="hidden" name="thumb_crop_x" value={clampedCropX} />
    <input type="hidden" name="thumb_crop_y" value={clampedCropY} />
    <input type="hidden" name="thumb_crop_zoom" value={cropZoom} />
  </form>
</div>
