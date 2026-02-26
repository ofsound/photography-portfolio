export type TileRect = {
  top: number;
  left: number;
  width: number;
  height: number;
};

export type ImgCropTransform = {
  scale: number;
  translateX: number;
  translateY: number;
  /** For scale-only animation: origin at crop center avoids percentage-translate desync. */
  originX: number;
  originY: number;
  cropX?: number;
  cropY?: number;
};

export type TileAnimationSession = {
  slug: string;
  node: HTMLElement;
  /** Wrapper used for rect animation - has no aspect-ratio so width/height animate independently. */
  wrapper: HTMLElement | null;
  placeholder: HTMLElement;
  originalParent: Node;
  originalNextSibling: Node | null;
  currentRect: TileRect;
  imgCrop: ImgCropTransform | null;
};

type AnimationConfig = {
  durationMs?: number;
  easing?: string;
  reducedMotion?: boolean;
};

type PromoteConfig = AnimationConfig & {
  slug: string;
  node: HTMLElement;
  targetRect: TileRect;
  aspectRatio?: number;
  imgCropFrom?: ImgCropTransform | null;
};

const DEMOTE_Z_INDEX = 90;

const applyFixedRect = (node: HTMLElement, rect: TileRect, zIndex = 70) => {
  node.style.position = 'fixed';
  node.style.top = `${rect.top}px`;
  node.style.left = `${rect.left}px`;
  node.style.width = `${rect.width}px`;
  node.style.height = `${rect.height}px`;
  node.style.aspectRatio = 'auto';
  node.style.margin = '0';
  node.style.zIndex = String(zIndex);
  node.style.overflow = 'hidden';
  node.style.pointerEvents = 'none';
  node.style.transformOrigin = 'center center';
  node.style.contain = 'layout paint style';
  node.style.opacity = '1';
  node.dataset.promoted = 'true';
};

const clearFixedRect = (node: HTMLElement) => {
  node.style.removeProperty('position');
  node.style.removeProperty('top');
  node.style.removeProperty('left');
  node.style.removeProperty('width');
  node.style.removeProperty('height');
  node.style.removeProperty('aspect-ratio');
  node.style.removeProperty('margin');
  node.style.removeProperty('z-index');
  node.style.removeProperty('overflow');
  node.style.removeProperty('pointer-events');
  node.style.removeProperty('transform-origin');
  node.style.removeProperty('contain');
  node.style.removeProperty('opacity');
  delete node.dataset.promoted;
};

/** Apply rect to a wrapper; the child node fills it. Wrapper has no aspect-ratio. */
const applyRectToWrapper = (wrapper: HTMLElement, rect: TileRect, zIndex = 70) => {
  wrapper.style.position = 'fixed';
  wrapper.style.top = `${rect.top}px`;
  wrapper.style.left = `${rect.left}px`;
  wrapper.style.width = `${rect.width}px`;
  wrapper.style.height = `${rect.height}px`;
  wrapper.style.margin = '0';
  wrapper.style.zIndex = String(zIndex);
  wrapper.style.overflow = 'hidden';
  wrapper.style.pointerEvents = 'none';
  wrapper.style.contain = 'layout paint style';
  wrapper.style.opacity = '1';
};

const animateRect = async (node: HTMLElement, fromRect: TileRect, toRect: TileRect, options?: AnimationConfig) => {
  const durationMs = options?.durationMs ?? 520;
  const easing = options?.easing ?? 'cubic-bezier(0.16, 1, 0.3, 1)';
  const reducedMotion = options?.reducedMotion ?? false;

  if (reducedMotion || durationMs <= 0 || typeof node.animate !== 'function') {
    applyFixedRect(node, toRect);
    return;
  }

  const animation = node.animate(
    [
      {
        top: `${fromRect.top}px`,
        left: `${fromRect.left}px`,
        width: `${fromRect.width}px`,
        height: `${fromRect.height}px`
      },
      {
        top: `${toRect.top}px`,
        left: `${toRect.left}px`,
        width: `${toRect.width}px`,
        height: `${toRect.height}px`
      }
    ],
    {
      duration: durationMs,
      easing,
      fill: 'forwards'
    }
  );

  try {
    await animation.finished;
  } catch {
    // Ignore cancelled animations.
  }

  applyFixedRect(node, toRect);
};

const animateImgTransform = async (
  img: HTMLImageElement,
  from: ImgCropTransform,
  to: { scale: number; translateX: number; translateY: number },
  options?: AnimationConfig
) => {
  const durationMs = options?.durationMs ?? 520;
  const easing = options?.easing ?? 'cubic-bezier(0.16, 1, 0.3, 1)';
  const reducedMotion = options?.reducedMotion ?? false;

  if (reducedMotion || durationMs <= 0 || typeof img.animate !== 'function') {
    img.style.transform = `scale(${to.scale}) translate(${to.translateX}%, ${to.translateY}%)`;
    return;
  }

  const animation = img.animate(
    [
      {
        transform: `scale(${from.scale}) translate(${from.translateX}%, ${from.translateY}%)`
      },
      {
        transform: `scale(${to.scale}) translate(${to.translateX}%, ${to.translateY}%)`
      }
    ],
    {
      duration: durationMs,
      easing,
      fill: 'forwards'
    }
  );

  try {
    await animation.finished;
  } catch {
    // Ignore cancelled animations.
  }

  img.style.transform = `scale(${to.scale}) translate(${to.translateX}%, ${to.translateY}%)`;
};

const rectFromElement = (el: Element): TileRect => {
  const rect = el.getBoundingClientRect();
  return {
    top: rect.top,
    left: rect.left,
    width: rect.width,
    height: rect.height
  };
};

export const promoteTile = async ({
  slug,
  node,
  targetRect,
  aspectRatio,
  imgCropFrom,
  ...options
}: PromoteConfig): Promise<TileAnimationSession> => {
  const startRect = rectFromElement(node);
  const parent = node.parentNode;

  const placeholder = document.createElement('div');
  placeholder.dataset.tilePlaceholder = slug;
  if (aspectRatio != null && parent) {
    const cellRect = rectFromElement(parent);
    const size = Math.min(cellRect.width, cellRect.height);
    placeholder.style.width = `${size}px`;
    placeholder.style.height = `${size}px`;
    placeholder.style.aspectRatio = String(aspectRatio);
  } else {
    placeholder.style.width = `${startRect.width}px`;
    placeholder.style.height = `${startRect.height}px`;
  }
  placeholder.style.pointerEvents = 'none';
  placeholder.style.visibility = 'hidden';
  if (!parent) {
    throw new Error('Cannot promote a tile without a parent node.');
  }

  const nextSibling = node.nextSibling;
  parent.insertBefore(placeholder, node);
  parent.removeChild(node);

  // Use a wrapper with no aspect-ratio so width/height animate independently from square to portrait
  const wrapper = document.createElement('div');
  wrapper.dataset.promoted = 'true';
  node.style.width = '100%';
  node.style.height = '100%';
  node.style.aspectRatio = 'auto';
  node.style.display = 'block';
  node.style.margin = '0';
  wrapper.appendChild(node);
  document.body.appendChild(wrapper);

  applyRectToWrapper(wrapper, startRect);

  const img = node.querySelector('img');
  const identity = { scale: 1, translateX: 0, translateY: 0 };

  if (img && imgCropFrom) {
    const origin = `${imgCropFrom.originX * 100}% ${imgCropFrom.originY * 100}%`;
    img.style.transformOrigin = origin;
    img.style.objectFit = 'contain';
    const tx = imgCropFrom.translateX;
    const ty = imgCropFrom.translateY;
    const base = `translate(${tx}%, ${ty}%)`;
    const durationMs = options?.durationMs ?? 520;
    const easing = options?.easing ?? 'cubic-bezier(0.16, 1, 0.3, 1)';
    const reducedMotion = options?.reducedMotion ?? false;

    if (reducedMotion || durationMs <= 0 || typeof wrapper.animate !== 'function') {
      applyRectToWrapper(wrapper, targetRect);
      img.style.transform = '';
      img.style.objectFit = 'contain';
    } else {
      const rectTiming: KeyframeAnimationOptions = { duration: durationMs, easing: 'linear', fill: 'forwards' };
      const imgTiming: KeyframeAnimationOptions = { duration: durationMs, easing, fill: 'forwards' };
      const rectAnim = wrapper.animate(
        [
          { top: `${startRect.top}px`, left: `${startRect.left}px`, width: `${startRect.width}px`, height: `${startRect.height}px` },
          { top: `${targetRect.top}px`, left: `${targetRect.left}px`, width: `${targetRect.width}px`, height: `${targetRect.height}px` }
        ],
        rectTiming
      );
      const imgAnim = img.animate(
        [{ transform: `${base} scale(${imgCropFrom.scale})` }, { transform: `${base} scale(1)` }],
        imgTiming
      );
      await Promise.all([rectAnim.finished, imgAnim.finished]);
      applyRectToWrapper(wrapper, targetRect);
      img.style.transform = '';
      img.style.objectFit = 'contain';
    }
  } else {
    if (options?.reducedMotion || (options?.durationMs ?? 520) <= 0 || typeof wrapper.animate !== 'function') {
      applyRectToWrapper(wrapper, targetRect);
    } else {
      await wrapper.animate(
        [
          { top: `${startRect.top}px`, left: `${startRect.left}px`, width: `${startRect.width}px`, height: `${startRect.height}px` },
          { top: `${targetRect.top}px`, left: `${targetRect.left}px`, width: `${targetRect.width}px`, height: `${targetRect.height}px` }
        ],
        { duration: options?.durationMs ?? 520, easing: options?.easing ?? 'cubic-bezier(0.16, 1, 0.3, 1)', fill: 'forwards' }
      ).finished;
      applyRectToWrapper(wrapper, targetRect);
    }
  }

  return {
    slug,
    node,
    wrapper,
    placeholder,
    originalParent: parent,
    originalNextSibling: nextSibling,
    currentRect: targetRect,
    imgCrop: imgCropFrom ?? null
  };
};

export const movePromotedTile = async (session: TileAnimationSession, targetRect: TileRect, options?: AnimationConfig) => {
  const el = session.wrapper ?? session.node;
  await animateRect(el, session.currentRect, targetRect, options);
  session.currentRect = targetRect;
};

export const getPlaceholderRect = (session: TileAnimationSession): TileRect => rectFromElement(session.placeholder);

type DemoteOptions = AnimationConfig & {
  useCover?: boolean;
  /** Optional separate easing for img (scale) - use when rect and scale need different curves to feel in sync. */
  imgEasing?: string;
};

/** Animates the tile to its placeholder position. Does NOT reinsert. Call reinsertPromotedTile after overlay has faded. */
export const demoteTile = async (session: TileAnimationSession, options?: DemoteOptions) => {
  const rectEl = session.wrapper ?? session.node;
  rectEl.style.zIndex = String(DEMOTE_Z_INDEX);
  rectEl.style.opacity = '1';
  const img = session.node.querySelector('img');
  const targetRect = getPlaceholderRect(session);
  const identity = { scale: 1, translateX: 0, translateY: 0 };
  if (img && session.imgCrop) {
    img.style.objectFit = 'cover';
    const origin = `${session.imgCrop.originX * 100}% ${session.imgCrop.originY * 100}%`;
    img.style.transformOrigin = origin;
    const tx = session.imgCrop.translateX;
    const ty = session.imgCrop.translateY;
    const base = `translate(${tx}%, ${ty}%)`;
    const durationMs = options?.durationMs ?? 520;
    const rectEasing = options?.easing ?? 'cubic-bezier(0.16, 1, 0.3, 1)';
    const reducedMotion = options?.reducedMotion ?? false;

    if (reducedMotion || durationMs <= 0 || typeof rectEl.animate !== 'function') {
      applyRectToWrapper(rectEl, targetRect, DEMOTE_Z_INDEX);
      img.style.transform = `${base} scale(${session.imgCrop.scale})`;
    } else {
      const timing: KeyframeAnimationOptions = { duration: durationMs, easing: rectEasing, fill: 'forwards' };
      const rectAnim = rectEl.animate(
        [
          { top: `${session.currentRect.top}px`, left: `${session.currentRect.left}px`, width: `${session.currentRect.width}px`, height: `${session.currentRect.height}px` },
          { top: `${targetRect.top}px`, left: `${targetRect.left}px`, width: `${targetRect.width}px`, height: `${targetRect.height}px` }
        ],
        timing
      );
      const imgAnim = img.animate(
        [{ transform: `${base} scale(1)` }, { transform: `${base} scale(${session.imgCrop.scale})` }],
        timing
      );
      await Promise.all([rectAnim.finished, imgAnim.finished]);
      applyRectToWrapper(rectEl, targetRect, DEMOTE_Z_INDEX);
      img.style.transform = `scale(${session.imgCrop.scale})`;
    }
  } else {
    await animateRect(rectEl, session.currentRect, targetRect, options);
  }
  session.currentRect = targetRect;
};

/** Reinserts the promoted tile into the grid. Call after overlay has faded so the tile stays on top during the fade. */
export const reinsertPromotedTile = (
  session: TileAnimationSession,
  options?: { preserveDimensions?: boolean }
) => {
  (session.wrapper ?? session.node).getAnimations().forEach((a) => a.cancel());
  if (session.wrapper) {
    session.wrapper.replaceWith(session.node);
  }
  const rect = options?.preserveDimensions ? getPlaceholderRect(session) : null;
  clearFixedRect(session.node);
  if (rect) {
    session.node.style.width = `${rect.width}px`;
    session.node.style.height = `${rect.height}px`;
    session.node.style.aspectRatio = 'auto';
  }
  const parent = session.placeholder.parentNode;
  if (parent) {
    parent.insertBefore(session.node, session.placeholder);
    parent.removeChild(session.placeholder);
  } else {
    session.originalParent.insertBefore(session.node, session.originalNextSibling);
  }
};

export const releasePromotedTile = (
  session: TileAnimationSession,
  options?: { preserveDimensions?: boolean }
) => {
  (session.wrapper ?? session.node).getAnimations().forEach((a) => a.cancel());
  if (session.wrapper) {
    session.wrapper.replaceWith(session.node);
  }
  const rect = options?.preserveDimensions ? getPlaceholderRect(session) : null;
  clearFixedRect(session.node);
  if (rect) {
    session.node.style.width = `${rect.width}px`;
    session.node.style.height = `${rect.height}px`;
    session.node.style.aspectRatio = 'auto';
  }
  // Restore img crop transform when reinserting into grid
  if (session.imgCrop) {
    const img = session.node.querySelector('img');
    if (img) {
      img.style.objectFit = 'contain';
      img.style.transformOrigin = `${session.imgCrop.originX * 100}% ${session.imgCrop.originY * 100}%`;
      img.style.transform = `translate(${session.imgCrop.translateX}%, ${session.imgCrop.translateY}%) scale(${session.imgCrop.scale})`;
    }
  }
  const parent = session.placeholder.parentNode;
  if (parent) {
    parent.insertBefore(session.node, session.placeholder);
    parent.removeChild(session.placeholder);
    return;
  }

  session.originalParent.insertBefore(session.node, session.originalNextSibling);
};

import { thumbCropTransform as thumbCropTransformUtil } from '$lib/utils/thumb-crop';

/** Match admin ThumbnailCropEditor exactly - uses shared thumb-crop.ts. imgWidth/imgHeight = imageAspect. */
export const cropToImgTransform = (
  cropX: number,
  cropY: number,
  cropZoom: number,
  imageAspect: number,
  containerAspect = 1
): ImgCropTransform => {
  const imgW = Math.max(1, imageAspect);
  const imgH = 1;
  const t = thumbCropTransformUtil(cropX, cropY, cropZoom, imgW, imgH, containerAspect);
  return {
    scale: t.scale,
    translateX: t.translateX,
    translateY: t.translateY,
    originX: t.originX,
    originY: t.originY,
    cropX,
    cropY
  };
};

export const computeContainRect = (
  viewportWidth: number,
  viewportHeight: number,
  imageWidth: number,
  imageHeight: number,
  chromeTopOffset: number,
  chromeBottomOffset: number,
  horizontalPadding = 12,
  verticalPadding = 12
): TileRect => {
  const safeImageWidth = Math.max(1, imageWidth);
  const safeImageHeight = Math.max(1, imageHeight);
  const availableWidth = Math.max(1, viewportWidth - horizontalPadding * 2);
  const availableHeight = Math.max(1, viewportHeight - chromeTopOffset - chromeBottomOffset - verticalPadding * 2);

  const imageRatio = safeImageWidth / safeImageHeight;
  const viewportRatio = availableWidth / availableHeight;

  let width = availableWidth;
  let height = availableHeight;

  if (imageRatio > viewportRatio) {
    height = width / imageRatio;
  } else {
    width = height * imageRatio;
  }

  return {
    top: chromeTopOffset + verticalPadding + (availableHeight - height) / 2,
    left: horizontalPadding + (availableWidth - width) / 2,
    width,
    height
  };
};
