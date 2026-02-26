/**
 * Thumbnail crop math - must match ThumbnailCropEditor.svelte exactly.
 *
 * Admin uses: square container, image with object-contain.
 * containedRect: when imgAspect >= 1 (landscape): full width, height = width/imgAspect, top = (size - height)/2
 *                when imgAspect < 1 (portrait): full height, width = height*imgAspect, left = (size - width)/2
 * Crop center (cropX, cropY) in image coords maps to container coords:
 *   landscape: originX = cropX, originY = (1 - 1/imgAspect)/2 + cropY/imgAspect
 *   portrait:  originX = (1 - imgAspect)/2 + cropX*imgAspect, originY = cropY
 *
 * General case for container with containerAspect = width/height:
 *   imgAspect >= containerAspect: originX = cropX, originY = 0.5 - 0.5*cA/iA + cropY*cA/iA
 *   imgAspect < containerAspect:  originX = 0.5 - 0.5*iA/cA + cropX*iA/cA, originY = cropY
 */

export function cropCenterToElementCoords(
  cropX: number,
  cropY: number,
  imgWidth: number,
  imgHeight: number,
  containerAspect: number
): { originX: number; originY: number } {
  const iA = Math.max(0.01, imgWidth / imgHeight);
  const cA = Math.max(0.01, containerAspect);

  if (iA >= cA) {
    return {
      originX: cropX,
      originY: 0.5 - (0.5 * cA) / iA + (cropY * cA) / iA
    };
  }
  return {
    originX: 0.5 - (0.5 * iA) / cA + (cropX * iA) / cA,
    originY: cropY
  };
}

/** CSS transform values for img with object-fit: contain. Zoom from admin: cropSide = min(W,H)/zoom. */
export function thumbCropTransform(
  cropX: number,
  cropY: number,
  zoom: number,
  imgWidth: number,
  imgHeight: number,
  containerAspect: number
): { translateX: number; translateY: number; scale: number; originX: number; originY: number } {
  const { originX, originY } = cropCenterToElementCoords(
    cropX,
    cropY,
    imgWidth,
    imgHeight,
    containerAspect
  );
  return {
    translateX: (0.5 - originX) * 100,
    translateY: (0.5 - originY) * 100,
    scale: zoom,
    originX,
    originY
  };
}
