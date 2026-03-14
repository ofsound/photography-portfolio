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
  hiddenRoot: HTMLElement | null;
  renderScale: number;
  rootRect: RootRect;
  tiles: SvelteMap<string, TileMetric>;
  currentTransform: string;
  currentOrigin: string;
  currentValues: TransformValues;
  onClick: (event: MouseEvent) => void;
  originalParent: Node | null;
  originalNextSibling: Node | null;
  placeholder: HTMLElement;
  originalCssText: string;
};

type CreateGalleryContactSheetViewerOptions = {
  state: GallerySceneState;
  reducedMotion: () => boolean;
  isMobileViewport: () => boolean;
  smoothSafariMode: () => boolean;
  getSettings: () => ContactSheetSettings;
  onRetargetRequest: (slug: string) => void;
};

type TransformOrigin = {
  x: number;
  y: number;
};

type TransformValues = {
  tx: number;
  ty: number;
  tz: number;
  scale: number;
  rotateX: number;
  rotateY: number;
};

const OPEN_EASING = 'cubic-bezier(0.16, 1, 0.3, 1)';
const NAV_EASING = 'cubic-bezier(0.22, 1, 0.36, 1)';
const CONTACT_SHEET_FRAME_ATTR = 'data-contact-sheet-frame';

const waitForFrame = () =>
  new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const toTransformString = (values: TransformValues) =>
  `translate3d(${values.tx}px, ${values.ty}px, ${values.tz}px) scale(${values.scale}) rotateX(${values.rotateX}deg) rotateY(${values.rotateY}deg)`;

const parseOrigin = (origin: string): TransformOrigin => {
  const [xToken = '0', yToken = '0'] = origin.split(' ');
  return {
    x: Number.parseFloat(xToken) || 0,
    y: Number.parseFloat(yToken) || 0,
  };
};

const adjustForOriginChange = (
  values: TransformValues,
  from: TransformOrigin,
  to: TransformOrigin,
): TransformValues => {
  const scaleDelta = values.scale - 1;
  if (scaleDelta === 0) return values;

  return {
    ...values,
    tx: values.tx + (from.x - to.x) * scaleDelta,
    ty: values.ty + (from.y - to.y) * scaleDelta,
  };
};

const rectFromElement = (node: Element): RootRect => {
  const rect = node.getBoundingClientRect();
  return {
    top: rect.top,
    left: rect.left,
    width: rect.width,
    height: rect.height,
  };
};

const placeholderRect = (node: HTMLElement): RootRect | null => {
  const rect = node.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) return null;

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
  smoothSafariMode,
  getSettings,
  onRetargetRequest,
}: CreateGalleryContactSheetViewerOptions): GalleryViewerController => {
  let gridRoot = $state<HTMLElement | null>(null);
  let session = $state<ContactSheetSession | null>(null);
  let sessionPromise: Promise<ContactSheetSession | null> | null = null;
  let isAnimating = $state(false);
  const tileRefs = new SvelteMap<string, HTMLElement>();

  const shouldSoftenForMobile = () => isMobileViewport() && !reducedMotion();

  const effectiveSettings = () => {
    const base = getSettings();
    const intensity = shouldSoftenForMobile()
      ? clamp(base.mobileIntensityPct / 100, 0, 1)
      : 1;
    const useSmoothSafariProfile = smoothSafariMode() && !reducedMotion();

    return {
      perspectivePx: base.perspectivePx,
      rotateXDeg: reducedMotion()
        ? 0
        : useSmoothSafariProfile
          ? 0
          : base.rotateXDeg * intensity,
      rotateYDeg: reducedMotion()
        ? 0
        : useSmoothSafariProfile
          ? 0
          : base.rotateYDeg * intensity,
      travelZPx: reducedMotion()
        ? 0
        : useSmoothSafariProfile
          ? clamp(base.travelZPx * intensity * 0.22, 0, 28)
          : base.travelZPx * intensity,
      targetFillPct: base.targetFillPct,
    };
  };

  const releaseSession = (restoreRoot = true) => {
    if (!session) return;

    session.sheet.removeEventListener('click', session.onClick);

    if (restoreRoot) {
      if (session.hiddenRoot) {
        session.hiddenRoot.style.removeProperty('visibility');
      }
      session.sourceRoot.style.cssText = session.originalCssText;
      session.sourceRoot.removeAttribute('data-contact-sheet-promoted');
      if (session.originalParent) {
        if (
          session.placeholder &&
          session.placeholder.parentNode === session.originalParent
        ) {
          session.originalParent.insertBefore(
            session.sourceRoot,
            session.placeholder,
          );
          session.placeholder.remove();
        } else {
          session.originalParent.insertBefore(
            session.sourceRoot,
            session.originalNextSibling,
          );
        }
      }
    }

    session.frame.remove();
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
    const values: TransformValues = {
      tx,
      ty,
      tz: travelZ,
      scale,
      rotateX,
      rotateY,
    };

    return { origin, transform: toTransformString(values), values };
  };

  const resetValuesFor = (
    nextSession: ContactSheetSession,
  ): TransformValues => {
    const fallbackScale = 1 / nextSession.renderScale;
    const targetRect = placeholderRect(nextSession.placeholder);
    if (!targetRect) {
      return {
        tx: 0,
        ty: 0,
        tz: 0,
        scale: fallbackScale,
        rotateX: 0,
        rotateY: 0,
      };
    }

    return {
      tx: targetRect.left - nextSession.rootRect.left,
      ty: targetRect.top - nextSession.rootRect.top,
      tz: 0,
      scale: fallbackScale,
      rotateX: 0,
      rotateY: 0,
    };
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
    const fromValues = session.currentValues;
    const smoothSafariProfile = smoothSafariMode() && !reducedMotion();

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
        const animation = smoothSafariProfile
          ? (() => {
              const adjustedFromValues = adjustForOriginChange(
                fromValues,
                parseOrigin(fromOrigin),
                parseOrigin(target.origin),
              );
              session.sheet.style.transformOrigin = target.origin;

              return session.sheet.animate(
                [
                  {
                    transform: toTransformString(adjustedFromValues),
                  },
                  {
                    transform: target.transform,
                  },
                ],
                {
                  duration: durationMs,
                  easing,
                  fill: 'forwards',
                },
              );
            })()
          : session.sheet.animate(
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
      session.currentValues = target.values;
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

    const geometry = measureGeometry();
    if (!geometry || !geometry.tiles.has(activeSlug)) return null;

    // renderScale is strictly 1 to prevent grid subpixel fractional layout shifts
    // Chrome handles 'transform: scale()' perfectly for 3D elements inside Web Animations API frames natively.
    const renderScale = 1;

    const frame = document.createElement('div');
    frame.setAttribute(CONTACT_SHEET_FRAME_ATTR, 'true');
    frame.style.position = 'fixed';
    frame.style.inset = '0';
    frame.style.zIndex = '70';
    frame.style.pointerEvents = 'none';

    const sheet = document.createElement('div');
    sheet.style.position = 'absolute';
    sheet.style.top = `${geometry.rootRect.top}px`;
    sheet.style.left = `${geometry.rootRect.left}px`;
    sheet.style.width = `${geometry.rootRect.width * renderScale}px`;
    sheet.style.height = `${geometry.rootRect.height * renderScale}px`;
    sheet.style.margin = '0';
    sheet.style.pointerEvents = 'auto';
    sheet.style.transformOrigin = '0px 0px';
    const initialValues: TransformValues = {
      tx: 0,
      ty: 0,
      tz: 0,
      scale: 1 / renderScale,
      rotateX: 0,
      rotateY: 0,
    };
    sheet.style.transform = toTransformString(initialValues);
    sheet.style.transformStyle = smoothSafariMode() ? 'flat' : 'preserve-3d';
    sheet.style.backfaceVisibility = 'hidden';

    // Adopt the original gridRoot instead of cloning it
    const sourceRoot = gridRoot;
    const originalParent = sourceRoot.parentNode;
    const originalNextSibling = sourceRoot.nextSibling;

    // Keep the original footprint in the layout so the promoted sheet can
    // animate back to the live grid position without a final snap.
    const placeholder = document.createElement('div');
    placeholder.style.width = `${geometry.rootRect.width}px`;
    placeholder.style.height = `${geometry.rootRect.height}px`;
    placeholder.style.pointerEvents = 'none';
    placeholder.style.visibility = 'hidden';
    placeholder.setAttribute('aria-hidden', 'true');
    if (originalParent) {
      originalParent.insertBefore(placeholder, sourceRoot);
    }
    const originalCssText = sourceRoot.style.cssText;

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
      hiddenRoot: null,
      renderScale,
      rootRect: geometry.rootRect,
      tiles: geometry.tiles,
      currentTransform: toTransformString(initialValues),
      currentOrigin: '0px 0px',
      currentValues: initialValues,
      onClick,
      originalParent,
      originalNextSibling,
      placeholder,
      originalCssText,
    } satisfies ContactSheetSession;
  };

  const ensureSession = async (activeSlug: string) => {
    if (session?.tiles.has(activeSlug)) return session;

    if (sessionPromise) {
      const existing = await sessionPromise;
      if (existing?.tiles.has(activeSlug)) return existing;
    }

    const creation = (async () => {
      releaseSession(true);
      const newSession = await createSession(activeSlug);
      session = newSession;
      return newSession;
    })();

    sessionPromise = creation;
    const result = await creation;
    if (sessionPromise === creation) {
      sessionPromise = null;
    }
    return result;
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
    if (
      !state.activeSlug ||
      state.activeSlug !== slug ||
      session ||
      sessionPromise
    )
      return;

    // Direct entry hydration sequence: the geometry layout may be 0x0
    // initially because images or fonts haven't reflowed.
    // Try to open, and if it fails, retry after a few frames.
    const hydrate = async (attempts: number) => {
      if (session || sessionPromise || state.activeSlug !== slug) return;

      const geom = measureGeometry();
      if (!geom || !geom.tiles.has(slug)) {
        if (attempts > 0) {
          await waitForFrame();
          hydrate(attempts - 1);
        }
        return;
      }

      // Allow the layout to fully stabilize before promoting elements to a fixed layer.
      await waitForFrame();
      await waitForFrame();

      void open(slug, state.activeImageId, false);
    };

    void hydrate(20); // allow up to ~20 frames for the tile to physically appear.
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
      // If we failed to ensureSession (e.g. tile not loaded), re-attempt hydration
      maybeHydrateOpenState(slug);
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

    // We dynamically generate a high-resoluton renderScale from the start.
    // Re-promotions are no longer necessary to restore full detail.
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
        const resetValues = resetValuesFor(session);
        const closeAnimation = smoothSafariMode()
          ? (() => {
              const adjustedFromValues = adjustForOriginChange(
                session.currentValues,
                parseOrigin(session.currentOrigin),
                { x: 0, y: 0 },
              );
              session.sheet.style.transformOrigin = '0px 0px';

              return session.sheet.animate(
                [
                  {
                    transform: toTransformString(adjustedFromValues),
                  },
                  {
                    transform: toTransformString(resetValues),
                  },
                ],
                {
                  duration: 520,
                  easing: OPEN_EASING,
                  fill: 'forwards',
                },
              );
            })()
          : session.sheet.animate(
              [
                {
                  transformOrigin: session.currentOrigin,
                  transform: session.currentTransform,
                },
                {
                  transformOrigin: '0px 0px',
                  transform: toTransformString(resetValues),
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

        session.sheet.style.transformOrigin = '0px 0px';
        session.sheet.style.transform = toTransformString(resetValues);
        session.currentOrigin = '0px 0px';
        session.currentTransform = toTransformString(resetValues);
        session.currentValues = resetValues;
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
