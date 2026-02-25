export type TileRect = {
  top: number;
  left: number;
  width: number;
  height: number;
};

export type TileAnimationSession = {
  slug: string;
  node: HTMLElement;
  placeholder: HTMLElement;
  originalParent: Node;
  originalNextSibling: Node | null;
  currentRect: TileRect;
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
};

const DEMOTE_Z_INDEX = 90;

const applyFixedRect = (node: HTMLElement, rect: TileRect) => {
  node.style.position = 'fixed';
  node.style.top = `${rect.top}px`;
  node.style.left = `${rect.left}px`;
  node.style.width = `${rect.width}px`;
  node.style.height = `${rect.height}px`;
  node.style.margin = '0';
  node.style.zIndex = '70';
  node.style.overflow = 'hidden';
  node.style.pointerEvents = 'none';
  node.style.transformOrigin = 'center center';
  node.style.contain = 'layout paint style';
  node.style.opacity = '1';
};

const clearFixedRect = (node: HTMLElement) => {
  node.style.removeProperty('position');
  node.style.removeProperty('top');
  node.style.removeProperty('left');
  node.style.removeProperty('width');
  node.style.removeProperty('height');
  node.style.removeProperty('margin');
  node.style.removeProperty('z-index');
  node.style.removeProperty('overflow');
  node.style.removeProperty('pointer-events');
  node.style.removeProperty('transform-origin');
  node.style.removeProperty('contain');
  node.style.removeProperty('opacity');
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

const rectFromElement = (el: Element): TileRect => {
  const rect = el.getBoundingClientRect();
  return {
    top: rect.top,
    left: rect.left,
    width: rect.width,
    height: rect.height
  };
};

export const promoteTile = async ({ slug, node, targetRect, ...options }: PromoteConfig): Promise<TileAnimationSession> => {
  const startRect = rectFromElement(node);
  const placeholder = document.createElement('div');
  placeholder.dataset.tilePlaceholder = slug;
  placeholder.style.width = `${startRect.width}px`;
  placeholder.style.height = `${startRect.height}px`;
  placeholder.style.pointerEvents = 'none';
  placeholder.style.visibility = 'hidden';

  const parent = node.parentNode;
  if (!parent) {
    throw new Error('Cannot promote a tile without a parent node.');
  }

  const nextSibling = node.nextSibling;
  parent.insertBefore(placeholder, node);
  parent.removeChild(node);
  document.body.appendChild(node);

  applyFixedRect(node, startRect);
  await animateRect(node, startRect, targetRect, options);

  return {
    slug,
    node,
    placeholder,
    originalParent: parent,
    originalNextSibling: nextSibling,
    currentRect: targetRect
  };
};

export const movePromotedTile = async (session: TileAnimationSession, targetRect: TileRect, options?: AnimationConfig) => {
  await animateRect(session.node, session.currentRect, targetRect, options);
  session.currentRect = targetRect;
};

export const getPlaceholderRect = (session: TileAnimationSession): TileRect => rectFromElement(session.placeholder);

/** Animates the tile to its placeholder position. Does NOT reinsert. Call reinsertPromotedTile after overlay has faded. */
export const demoteTile = async (session: TileAnimationSession, options?: AnimationConfig) => {
  session.node.style.zIndex = String(DEMOTE_Z_INDEX);
  session.node.style.opacity = '1';
  const targetRect = getPlaceholderRect(session);
  await animateRect(session.node, session.currentRect, targetRect, options);
  session.currentRect = targetRect;
};

/** Reinserts the promoted tile into the grid. Call after overlay has faded so the tile stays on top during the fade. */
export const reinsertPromotedTile = (session: TileAnimationSession) => {
  session.node.getAnimations().forEach((a) => a.cancel());
  clearFixedRect(session.node);
  const parent = session.placeholder.parentNode;
  if (parent) {
    parent.insertBefore(session.node, session.placeholder);
    parent.removeChild(session.placeholder);
  } else {
    session.originalParent.insertBefore(session.node, session.originalNextSibling);
  }
};

export const releasePromotedTile = (session: TileAnimationSession) => {
  session.node.getAnimations().forEach((a) => a.cancel());
  clearFixedRect(session.node);
  const parent = session.placeholder.parentNode;
  if (parent) {
    parent.insertBefore(session.node, session.placeholder);
    parent.removeChild(session.placeholder);
    return;
  }

  session.originalParent.insertBefore(session.node, session.originalNextSibling);
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
