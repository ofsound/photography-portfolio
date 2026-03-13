import { SvelteMap } from 'svelte/reactivity';
import type { GallerySceneState } from './createGallerySceneState.svelte';
import type { GalleryViewerController } from './gallery-viewer-controller';

type ContactSheetSettings = {
  perspectivePx: number;
  rotateXDeg: number;
  rotateYDeg: number;
  travelZPx: number;
  targetFillPct: number;
  mobileIntensityPct: number;
};

type TileMetric = {
  centerX: number;
  centerY: number;
  width: number;
  height: number;
};

type RootRect = {
  top: number;
  left: number;
  width: number;
  height: number;
};

type SheetGeometry = {
  rootRect: RootRect;
  tiles: SvelteMap<string, TileMetric>;
};

type ContactSheetSession = {
  activeSlug: string;
  frame: HTMLElement;
  sheet: HTMLElement;
  sourceRoot: HTMLElement;
  placeholder: HTMLElement;
  originalParent: Node;
  renderScale: number;
  rootRect: RootRect;
  tiles: SvelteMap<string, TileMetric>;
  currentTransform: string;
  currentOrigin: string;
  onClick: (event: MouseEvent) => void;
};

type CreateGalleryContactSheetViewerOptions = {
  state: GallerySceneState;
  reducedMotion: () => boolean;
  isMobileViewport: () => boolean;
  getSettings: () => ContactSheetSettings;
  onRetargetRequest: (slug: string) => void;
};

const OPEN_EASING = 'cubic-bezier(0.16, 1, 0.3, 1)';
const NAV_EASING = 'cubic-bezier(0.22, 1, 0.36, 1)';
const CONTACT_SHEET_FRAME_ATTR = 'data-contact-sheet-frame';

const waitForFrame = () =>
  new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const rectFromElement = (node: Element): RootRect => {
  const rect = node.getBoundingClientRect();
  return {
    top: rect.top,
    left: rect.left,
    width: rect.width,
    height: rect.height,
  };
};

export const createGalleryContactSheetViewer = ({
  state,
  reducedMotion,
  isMobileViewport,
  getSettings,
  onRetargetRequest,
}: CreateGalleryContactSheetViewerOptions): GalleryViewerController => {
  let gridRoot = $state<HTMLElement | null>(null);
  let session = $state<ContactSheetSession | null>(null);
  let isAnimating = $state(false);
  const tileRefs = new SvelteMap<string, HTMLElement>();

  const shouldSoftenForMobile = () => isMobileViewport() && !reducedMotion();

  const effectiveSettings = () => {
    const base = getSettings();
    const intensity = shouldSoftenForMobile()
      ? clamp(base.mobileIntensityPct / 100, 0, 1)
      : 1;

    return {
      perspectivePx: base.perspectivePx,
      rotateXDeg: reducedMotion() ? 0 : base.rotateXDeg * intensity,
      rotateYDeg: reducedMotion() ? 0 : base.rotateYDeg * intensity,
      travelZPx: reducedMotion() ? 0 : base.travelZPx * intensity,
      targetFillPct: base.targetFillPct,
    };
  };

  const releaseSession = (restoreRoot = true) => {
    if (!session) return;

    session.sheet.removeEventListener('click', session.onClick);
    session.frame.remove();

    if (restoreRoot) {
      session.sourceRoot.style.removeProperty('position');
      session.sourceRoot.style.removeProperty('top');
      session.sourceRoot.style.removeProperty('left');
      session.sourceRoot.style.removeProperty('width');
      session.sourceRoot.style.removeProperty('height');
      session.sourceRoot.style.removeProperty('margin');
      session.sourceRoot.style.removeProperty('pointer-events');
      session.sourceRoot.style.removeProperty('transform-origin');
      session.sourceRoot.style.removeProperty('transform');
      session.sourceRoot.style.removeProperty('transform-style');
      session.sourceRoot.style.removeProperty('backface-visibility');
      session.sourceRoot.removeAttribute('data-contact-sheet-promoted');

      if (session.placeholder.isConnected) {
        session.placeholder.replaceWith(session.sourceRoot);
      } else if (session.originalParent instanceof Element) {
        session.originalParent.appendChild(session.sourceRoot);
      }

      session.placeholder.remove();
    }

    session = null;
    isAnimating = false;
  };

  const cleanupOrphanFrames = () => {
    if (typeof document === 'undefined') return;

    const frames = document.querySelectorAll<HTMLElement>(
      `[${CONTACT_SHEET_FRAME_ATTR}="true"]`,
    );
    for (const frame of frames) {
      if (session && frame === session.frame) continue;
      if (frame.childElementCount === 0) {
        frame.remove();
      }
    }
  };

  const measureGeometry = (): SheetGeometry | null => {
    if (!gridRoot) return null;

    const rootRect = rectFromElement(gridRoot);
    if (rootRect.width <= 0 || rootRect.height <= 0) return null;

    const tiles = new SvelteMap<string, TileMetric>();
    for (const [slug, node] of tileRefs) {
      const rect = node.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) continue;

      tiles.set(slug, {
        centerX: rect.left - rootRect.left + rect.width / 2,
        centerY: rect.top - rootRect.top + rect.height / 2,
        width: rect.width,
        height: rect.height,
      });
    }

    return {
      rootRect,
      tiles,
    };
  };

  const buildTransformFor = (
    nextSession: ContactSheetSession,
    slug: string,
  ) => {
    const metric = nextSession.tiles.get(slug);
    if (!metric) return null;

    const settings = effectiveSettings();
    const renderScale = nextSession.renderScale;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const viewportShortEdge = Math.max(
      1,
      Math.min(viewportWidth, viewportHeight),
    );
    const scaledCenterX = metric.centerX * renderScale;
    const scaledCenterY = metric.centerY * renderScale;
    const scaledTileWidth = metric.width * renderScale;
    const scaledTileHeight = metric.height * renderScale;
    const tileShortEdge = Math.max(
      1,
      Math.min(scaledTileWidth, scaledTileHeight),
    );
    const scale = clamp(
      (viewportShortEdge * settings.targetFillPct) / tileShortEdge,
      0.25,
      24,
    );

    const tx = viewportWidth / 2 - (nextSession.rootRect.left + scaledCenterX);
    const ty = viewportHeight / 2 - (nextSession.rootRect.top + scaledCenterY);

    const offsetX = clamp(
      (scaledCenterX - (nextSession.rootRect.width * renderScale) / 2) /
        Math.max(1, (nextSession.rootRect.width * renderScale) / 2),
      -1,
      1,
    );
    const offsetY = clamp(
      (scaledCenterY - (nextSession.rootRect.height * renderScale) / 2) /
        Math.max(1, (nextSession.rootRect.height * renderScale) / 2),
      -1,
      1,
    );
    const distance = clamp(Math.hypot(offsetX, offsetY), 0, 1.4);
    const rotateX = settings.rotateXDeg * offsetY;
    const rotateY = settings.rotateYDeg * -offsetX;
    const travelZ = settings.travelZPx * (0.65 + distance * 0.35);
    const origin = `${scaledCenterX}px ${scaledCenterY}px`;
    const transform = `translate3d(${tx}px, ${ty}px, ${travelZ}px) scale(${scale}) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;

    return { origin, transform };
  };

  const animateToSlug = async (
    slug: string,
    durationMs: number,
    easing: string,
  ) => {
    if (!session) return false;

    const target = buildTransformFor(session, slug);
    if (!target) return false;

    const nextPerspective = `${effectiveSettings().perspectivePx}px`;
    session.frame.style.perspective = nextPerspective;
    session.frame.style.perspectiveOrigin = '50% 50%';

    const fromTransform = session.currentTransform;
    const fromOrigin = session.currentOrigin;

    isAnimating = true;
    session.sheet.style.willChange = 'transform';

    try {
      if (
        reducedMotion() ||
        durationMs <= 0 ||
        typeof session.sheet.animate !== 'function'
      ) {
        session.sheet.style.transformOrigin = target.origin;
        session.sheet.style.transform = target.transform;
      } else {
        const animation = session.sheet.animate(
          [
            {
              transformOrigin: fromOrigin,
              transform: fromTransform,
            },
            {
              transformOrigin: target.origin,
              transform: target.transform,
            },
          ],
          {
            duration: durationMs,
            easing,
            fill: 'forwards',
          },
        );

        try {
          await animation.finished;
        } catch {
          // Ignore cancelled animations while switching targets.
        }
      }

      session.sheet.style.transformOrigin = target.origin;
      session.sheet.style.transform = target.transform;
      session.currentOrigin = target.origin;
      session.currentTransform = target.transform;
      session.activeSlug = slug;
      state.activeSlug = slug;
      return true;
    } finally {
      session.sheet.style.removeProperty('will-change');
      isAnimating = false;
    }
  };

  const createSession = async (activeSlug: string) => {
    if (!gridRoot) return null;

    cleanupOrphanFrames();
    await waitForFrame();
    await waitForFrame();

    const geometry = measureGeometry();
    if (!geometry || !geometry.tiles.has(activeSlug)) return null;

    const sourceRoot = gridRoot;
    const originalParent = sourceRoot.parentNode;
    if (!originalParent) return null;
    const renderScale = clamp(
      (window.devicePixelRatio || 1) * (isMobileViewport() ? 1.1 : 1.5),
      1,
      3,
    );

    const frame = document.createElement('div');
    frame.setAttribute(CONTACT_SHEET_FRAME_ATTR, 'true');
    frame.style.position = 'fixed';
    frame.style.inset = '0';
    frame.style.zIndex = '70';
    frame.style.overflow = 'hidden';
    frame.style.pointerEvents = 'none';

    const placeholder = document.createElement('div');
    placeholder.setAttribute('aria-hidden', 'true');
    placeholder.style.display = 'block';
    placeholder.style.width = `${geometry.rootRect.width}px`;
    placeholder.style.height = `${geometry.rootRect.height}px`;
    placeholder.style.pointerEvents = 'none';

    originalParent.insertBefore(placeholder, sourceRoot);

    const sheet = document.createElement('div');
    sheet.style.position = 'absolute';
    sheet.style.top = `${geometry.rootRect.top}px`;
    sheet.style.left = `${geometry.rootRect.left}px`;
    sheet.style.width = `${geometry.rootRect.width * renderScale}px`;
    sheet.style.height = `${geometry.rootRect.height * renderScale}px`;
    sheet.style.margin = '0';
    sheet.style.pointerEvents = 'auto';
    sheet.style.transformOrigin = '0px 0px';
    sheet.style.transform = `translate3d(0px, 0px, 0px) scale(${1 / renderScale}) rotateX(0deg) rotateY(0deg)`;
    sheet.style.transformStyle = 'preserve-3d';
    sheet.style.backfaceVisibility = 'hidden';

    sourceRoot.style.position = 'absolute';
    sourceRoot.style.top = '0';
    sourceRoot.style.left = '0';
    sourceRoot.style.width = `${geometry.rootRect.width}px`;
    sourceRoot.style.height = `${geometry.rootRect.height}px`;
    sourceRoot.style.margin = '0';
    sourceRoot.style.pointerEvents = 'auto';
    sourceRoot.style.transformOrigin = '0px 0px';
    sourceRoot.style.transform = `scale(${renderScale})`;
    sourceRoot.style.transformStyle = 'preserve-3d';
    sourceRoot.style.backfaceVisibility = 'hidden';
    sourceRoot.setAttribute('data-contact-sheet-promoted', 'true');

    const onClick = (event: MouseEvent) => {
      if (isAnimating) return;
      const target = event.target;
      if (!(target instanceof Element)) return;

      const tile = target.closest<HTMLElement>('[data-photo-slug]');
      const slug = tile?.dataset.photoSlug;
      if (!slug) return;

      event.preventDefault();
      event.stopPropagation();

      if (slug === session?.activeSlug) return;

      onRetargetRequest(slug);
    };

    sheet.addEventListener('click', onClick);
    sheet.appendChild(sourceRoot);
    frame.appendChild(sheet);
    document.body.appendChild(frame);

    return {
      activeSlug,
      frame,
      sheet,
      sourceRoot,
      placeholder,
      originalParent,
      renderScale,
      rootRect: geometry.rootRect,
      tiles: geometry.tiles,
      currentTransform: `translate3d(0px, 0px, 0px) scale(${1 / renderScale}) rotateX(0deg) rotateY(0deg)`,
      currentOrigin: '0px 0px',
      onClick,
    } satisfies ContactSheetSession;
  };

  const ensureSession = async (activeSlug: string) => {
    if (session?.tiles.has(activeSlug)) return session;

    releaseSession(true);
    session = await createSession(activeSlug);
    return session;
  };

  const reopenActive = async () => {
    if (!session) return;
    const activeSlug = session.activeSlug;
    releaseSession(true);
    session = await createSession(activeSlug);
    if (!session) return;
    await animateToSlug(activeSlug, 0, OPEN_EASING);
  };

  const maybeHydrateOpenState = (slug: string) => {
    if (!state.activeSlug || state.activeSlug !== slug || session) return;
    void open(state.activeSlug, state.activeImageId, false);
  };

  const open = async (
    slug: string,
    imageId: string | null,
    animate: boolean,
    durationMsOverride?: number,
  ) => {
    const nextSession = await ensureSession(slug);
    if (!nextSession) {
      state.activeSlug = slug;
      state.activeImageId = imageId;
      return;
    }

    session = nextSession;
    state.activeSlug = slug;
    state.activeImageId = imageId;
    await animateToSlug(
      slug,
      animate ? (durationMsOverride ?? 520) : 0,
      OPEN_EASING,
    );

    // Animated scale-up can leave the promoted layer rasterized too softly.
    // Re-promote once at rest to restore full detail after gallery-entry opens.
    if (animate && !reducedMotion()) {
      await reopenActive();
    }
  };

  const bindGridRoot = (node: HTMLElement) => {
    gridRoot = node;
    if (state.activeSlug) {
      maybeHydrateOpenState(state.activeSlug);
    }

    return {
      destroy() {
        if (gridRoot === node) {
          gridRoot = null;
        }
      },
    };
  };

  const registerTile = (node: HTMLElement, slug: string) => {
    tileRefs.set(slug, node);
    let currentSlug = slug;

    maybeHydrateOpenState(currentSlug);

    return {
      update(nextSlug: string) {
        if (tileRefs.get(currentSlug) === node) {
          tileRefs.delete(currentSlug);
        }

        currentSlug = nextSlug;
        tileRefs.set(currentSlug, node);
        maybeHydrateOpenState(currentSlug);
      },
      destroy() {
        if (tileRefs.get(currentSlug) === node) {
          tileRefs.delete(currentSlug);
        }
      },
    };
  };

  return {
    bindGridRoot,
    registerTile,
    open,
    async close(animate) {
      if (!session) {
        state.activeSlug = null;
        state.activeImageId = null;
        return;
      }

      if (
        !reducedMotion() &&
        animate &&
        typeof session.sheet.animate === 'function'
      ) {
        const closeAnimation = session.sheet.animate(
          [
            {
              transformOrigin: session.currentOrigin,
              transform: session.currentTransform,
            },
            {
              transformOrigin: '0px 0px',
              transform: `translate3d(0px, 0px, 0px) scale(${1 / session.renderScale}) rotateX(0deg) rotateY(0deg)`,
            },
          ],
          {
            duration: 520,
            easing: OPEN_EASING,
            fill: 'forwards',
          },
        );

        try {
          await closeAnimation.finished;
        } catch {
          // Ignore cancelled close animations.
        }
      }

      releaseSession(true);
      state.activeSlug = null;
      state.activeImageId = null;
    },
    async navigateNeighbor(targetSlug, _direction) {
      if (!(await ensureSession(targetSlug))) return false;
      const moved = await animateToSlug(targetSlug, 360, NAV_EASING);
      if (moved) {
        state.activeImageId = null;
      }
      return moved;
    },
    async retarget(targetSlug) {
      if (!(await ensureSession(targetSlug))) return;
      await animateToSlug(targetSlug, 320, NAV_EASING);
      state.activeImageId = null;
    },
    async resize() {
      if (!session) return;
      await reopenActive();
    },
    release() {
      releaseSession(true);
    },
    supportsAdditionalImages: false,
    get isReady() {
      return Boolean(session);
    },
  };
};
