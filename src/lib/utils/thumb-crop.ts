const MIN_THUMB_CROP_ASPECT = 0.2;
const MAX_THUMB_CROP_ASPECT = 3;

export const normalizeThumbCropAspect = (
  value: number | null | undefined,
): number => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return 1;
  }

  return Math.min(
    MAX_THUMB_CROP_ASPECT,
    Math.max(MIN_THUMB_CROP_ASPECT, parsed),
  );
};

/**
 * Thumbnail crop math - must match ThumbnailCropEditor.svelte exactly.
 *
 * Crop data is interpreted as a viewport over the original image:
 * - cropX / cropY = crop center in normalized image coordinates
 * - zoom = scale relative to the base object-fit: cover viewport
 * - containerAspect = the target thumbnail aspect ratio
 *
 * The transform is applied to an img with object-fit: cover.
 */

function cropCenterToElementCoords(
  cropX: number,
  cropY: number,
  imgWidth: number,
  imgHeight: number,
  containerAspect: number,
): { originX: number; originY: number } {
  const iA = Math.max(0.01, imgWidth / imgHeight);
  const cA = Math.max(0.01, normalizeThumbCropAspect(containerAspect));

  if (iA >= cA) {
    return {
      originX: 0.5 - (0.5 * iA) / cA + (cropX * iA) / cA,
      originY: cropY,
    };
  }
  return {
    originX: cropX,
    originY: 0.5 - (0.5 * cA) / iA + (cropY * cA) / iA,
  };
}

export const thumbCropVisibleWindow = (
  imgWidth: number,
  imgHeight: number,
  containerAspect: number,
  zoom: number,
) => {
  const iA = Math.max(0.01, imgWidth / imgHeight);
  const cA = Math.max(0.01, normalizeThumbCropAspect(containerAspect));
  const safeZoom = Math.max(1, zoom);

  if (iA >= cA) {
    return {
      visibleWidthNorm: cA / iA / safeZoom,
      visibleHeightNorm: 1 / safeZoom,
    };
  }

  return {
    visibleWidthNorm: 1 / safeZoom,
    visibleHeightNorm: iA / cA / safeZoom,
  };
};

export function thumbCropTransform(
  cropX: number,
  cropY: number,
  zoom: number,
  imgWidth: number,
  imgHeight: number,
  containerAspect: number,
): {
  translateX: number;
  translateY: number;
  scale: number;
  originX: number;
  originY: number;
  visibleWidthNorm: number;
  visibleHeightNorm: number;
} {
  const safeZoom = Math.max(1, zoom);
  const { originX, originY } = cropCenterToElementCoords(
    cropX,
    cropY,
    imgWidth,
    imgHeight,
    containerAspect,
  );
  const { visibleWidthNorm, visibleHeightNorm } = thumbCropVisibleWindow(
    imgWidth,
    imgHeight,
    containerAspect,
    safeZoom,
  );

  return {
    translateX: (0.5 - originX) * 100,
    translateY: (0.5 - originY) * 100,
    scale: safeZoom,
    originX,
    originY,
    visibleWidthNorm,
    visibleHeightNorm,
  };
}
