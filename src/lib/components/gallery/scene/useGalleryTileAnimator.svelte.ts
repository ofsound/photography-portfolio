import { untrack } from 'svelte';
import { SvelteMap } from 'svelte/reactivity';
import type { GalleryPhoto } from '$lib/types/content';
import { parseDimensions } from '$lib/utils/parse-dimensions';
import { thumbCropTransform } from '$lib/utils/thumb-crop';
import {
  computeContainRect,
  cropToImgTransform,
  demoteTile,
  movePromotedTile,
  promoteTile,
  releasePromotedTile,
  reinsertPromotedTile,
  type TileAnimationSession,
} from '../tile-animator';
import type { GalleryTransitionPhase } from '$lib/context/gallery-transition';
import type { GalleryImage, GalleryLayoutMode } from './gallery-scene.types';
import type { GallerySceneState } from './createGallerySceneState.svelte';

type GalleryTileAnimatorOptions = {
  state: GallerySceneState;
  getLayoutMode: () => GalleryLayoutMode;
  getUniformRatio: () => number;
  getContainerAspect: (photo: GalleryPhoto) => number;
  getDetailBottomInset: () => number;
  reducedMotion: () => boolean;
  setPhase: (phase: GalleryTransitionPhase) => void;
  scaleMaskMs: number;
  closingChromeMs: number;
};

const getViewportSize = () => {
  if (typeof window === 'undefined') return { width: 0, height: 0 };
  return {
    width: window.innerWidth,
    height: window.innerHeight,
  };
};

const wait = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

const offsetRect = (
  rect: { top: number; left: number; width: number; height: number },
  deltaX: number,
) => ({
  top: rect.top,
  left: rect.left + deltaX,
  width: rect.width,
  height: rect.height,
});

export const createGalleryTileAnimator = ({
  state,
  getLayoutMode,
  getUniformRatio,
  getContainerAspect,
  getDetailBottomInset,
  reducedMotion,
  setPhase,
  scaleMaskMs,
  closingChromeMs,
}: GalleryTileAnimatorOptions) => {
  let promoted = $state<TileAnimationSession | null>(null);
  const tileRefs = new SvelteMap<string, HTMLElement>();

  const findPhoto = (slug: string | null | undefined) => {
    if (!slug) return null;
    return state.photos.find((photo) => photo.slug === slug) ?? null;
  };

  const imageFor = (
    photo: GalleryPhoto,
    imageId: string | null,
  ): GalleryImage | null => {
    if (!photo.leadImage) return null;
    if (!imageId) return photo.leadImage;
    return (
      photo.additionalImages.find((image) => image.id === imageId) ??
      photo.leadImage
    );
  };

  const hasThumbCrop = (img: GalleryImage | null): boolean =>
    Boolean(
      getLayoutMode() === 'uniform' &&
      img &&
      img.thumb_crop_x != null &&
      img.thumb_crop_y != null &&
      img.thumb_crop_zoom != null &&
      img.thumb_crop_zoom >= 1,
    );

  const thumbCropStyle = (
    img: GalleryImage | null,
    containerAspect: number,
  ) => {
    if (!img || !hasThumbCrop(img)) return '';
    const parsed = parseDimensions(img.dimensions);
    const width = parsed?.width ?? 1;
    const height = parsed?.height ?? 1;

    const transform = thumbCropTransform(
      img.thumb_crop_x ?? 0.5,
      img.thumb_crop_y ?? 0.5,
      img.thumb_crop_zoom ?? 1,
      width,
      height,
      containerAspect,
    );

    return `object-fit: cover !important; transform: translate(${transform.translateX}%, ${transform.translateY}%) scale(${transform.scale}); transform-origin: ${transform.originX * 100}% ${transform.originY * 100}%;`;
  };

  const tileAspectRatio = (photo: GalleryPhoto) => {
    const parsed = parseDimensions(photo.leadImage?.dimensions);
    if (parsed) {
      return Math.max(0.2, parsed.width / parsed.height);
    }

    // Avoid subscribing layout solvers to tileRefs writes to prevent update loops.
    const node = untrack(() => tileRefs.get(photo.slug));
    const img = node?.querySelector('img');
    if (img && img.naturalWidth && img.naturalHeight) {
      return Math.max(0.2, img.naturalWidth / img.naturalHeight);
    }

    return getUniformRatio();
  };

  const imgCropFromForPhoto = (
    photo: GalleryPhoto,
    imageId: string | null,
    containerAspect: number,
  ) => {
    const img = imageFor(photo, imageId);
    if (!img || !hasThumbCrop(img)) return null;

    let imgAspect = 1;
    const parsed = parseDimensions(img.dimensions);
    if (parsed) {
      imgAspect = parsed.width / parsed.height;
    } else {
      const node = tileRefs.get(photo.slug);
      const imgEl = node?.querySelector('img');
      if (imgEl && imgEl.naturalWidth) {
        imgAspect = imgEl.naturalWidth / imgEl.naturalHeight;
      }
    }

    return cropToImgTransform(
      img.thumb_crop_x!,
      img.thumb_crop_y!,
      img.thumb_crop_zoom!,
      imgAspect,
      containerAspect,
    );
  };

  const targetRectFor = (
    photo: GalleryPhoto,
    imageId: string | null,
    node?: HTMLElement | null,
  ) => {
    const { width: viewportWidth, height: viewportHeight } = getViewportSize();

    const img = imageFor(photo, imageId);
    let imgWidth = 1000;
    let imgHeight = 1000;

    if (img) {
      const parsed = parseDimensions(img.dimensions);
      if (parsed) {
        imgWidth = parsed.width;
        imgHeight = parsed.height;
      } else if (node) {
        const imgEl = node.querySelector('img');
        if (imgEl && imgEl.naturalWidth) {
          imgWidth = imgEl.naturalWidth;
          imgHeight = imgEl.naturalHeight;
        }
      }
    }

    return computeContainRect(
      viewportWidth,
      viewportHeight,
      imgWidth,
      imgHeight,
      0,
      Math.max(0, getDetailBottomInset()),
      0,
      0,
    );
  };

  const ensurePromotedTile = async (
    slug: string,
    imageId: string | null,
    animate: boolean,
    durationMsOverride?: number,
  ) => {
    const photo = findPhoto(slug);
    if (!photo) return;

    const node = tileRefs.get(slug);
    if (!node) {
      state.activeSlug = slug;
      state.activeImageId = imageId;
      return;
    }

    const nextRect = targetRectFor(photo, imageId, node);
    const duration = durationMsOverride ?? (animate ? 520 : 0);
    const baseMotion = {
      reducedMotion: reducedMotion(),
      durationMs: duration,
      easing: 'cubic-bezier(0.16, 1, 0.3, 1)',
    };

    if (promoted && promoted.slug !== slug) {
      releasePromotedTile(promoted);
      promoted = null;
    }

    const containerAspect = getContainerAspect(photo);
    const imgCrop = imgCropFromForPhoto(photo, imageId, containerAspect);

    if (!promoted) {
      promoted = await promoteTile({
        slug,
        node,
        targetRect: nextRect,
        ...baseMotion,
        aspectRatio: containerAspect,
        imgCropFrom: imgCrop ?? undefined,
      });
    } else {
      await movePromotedTile(promoted, nextRect, baseMotion);
    }

    state.activeSlug = slug;
    state.activeImageId = imageId;
  };

  const collapsePromotedTile = async (animate: boolean) => {
    if (!promoted) {
      state.activeSlug = null;
      state.activeImageId = null;
      if (typeof document !== 'undefined') {
        document.body.style.overflow = '';
      }
      setPhase('idle');
      return;
    }

    const session = promoted;
    const placeholderRect = session.placeholder.getBoundingClientRect();
    const outOfView =
      placeholderRect.bottom < 0 || placeholderRect.top > window.innerHeight;

    if (outOfView) {
      session.placeholder.scrollIntoView({
        behavior: reducedMotion() ? 'auto' : 'smooth',
        block: 'center',
      });

      if (!reducedMotion()) {
        await wait(260);
      }
    }

    if (!reducedMotion()) {
      setPhase('closing-chrome');
      await wait(closingChromeMs);
    }

    setPhase('closing-scale');
    state.activeSlug = null;
    state.activeImageId = null;

    if (typeof document !== 'undefined') {
      document.body.style.overflow = '';
    }

    const layoutMode = getLayoutMode();
    await demoteTile(session, {
      reducedMotion: reducedMotion(),
      durationMs: animate ? scaleMaskMs : 0,
      easing: 'cubic-bezier(0.16, 1, 0.3, 1)',
      imgEasing: 'cubic-bezier(0.5, 0, 1, 1)',
      useCover:
        layoutMode === 'uniform' ||
        layoutMode === 'coverage' ||
        layoutMode === 'rows' ||
        layoutMode === 'columns',
    });

    if (reducedMotion()) {
      await wait(150);
    }

    reinsertPromotedTile(session);
    promoted = null;
    setPhase('idle');
  };

  const slideToNeighbor = async (
    targetSlug: string,
    direction: 'prev' | 'next',
  ) => {
    const targetPhoto = findPhoto(targetSlug);
    if (!targetPhoto) return false;

    const targetNode = tileRefs.get(targetSlug);
    if (!targetNode || !promoted || promoted.slug === targetSlug) {
      await ensurePromotedTile(targetSlug, null, false);
      return true;
    }

    const incomingFinalRect = targetRectFor(targetPhoto, null, targetNode);
    const { width: viewportWidth } = getViewportSize();
    const travel = Math.max(viewportWidth, incomingFinalRect.width + 72);
    const isNext = direction === 'next';

    const incomingStartRect = offsetRect(
      incomingFinalRect,
      isNext ? travel : -travel,
    );

    const outgoingEndRect = offsetRect(
      promoted.currentRect,
      isNext ? -travel : travel,
    );

    const outgoingSession = promoted;
    const incomingContainerAspect = getContainerAspect(targetPhoto);
    const incomingImgCrop = imgCropFromForPhoto(
      targetPhoto,
      null,
      incomingContainerAspect,
    );

    const incomingSession = await promoteTile({
      slug: targetSlug,
      node: targetNode,
      targetRect: incomingStartRect,
      reducedMotion: true,
      durationMs: 0,
      aspectRatio: incomingContainerAspect,
      imgCropFrom: incomingImgCrop ?? undefined,
    });

    const motion = {
      reducedMotion: reducedMotion(),
      durationMs: 360,
      easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
    };

    await Promise.all([
      movePromotedTile(outgoingSession, outgoingEndRect, motion),
      movePromotedTile(incomingSession, incomingFinalRect, motion),
    ]);

    promoted = incomingSession;
    state.activeSlug = targetSlug;
    state.activeImageId = null;
    releasePromotedTile(outgoingSession);

    return true;
  };

  const resizePromotedNow = async () => {
    if (!state.activeSlug || !promoted) return;

    const photo = findPhoto(state.activeSlug);
    if (!photo || !promoted) return;

    const nextRect = targetRectFor(photo, state.activeImageId, promoted.node);
    await movePromotedTile(promoted, nextRect, {
      reducedMotion: true,
      durationMs: 0,
    });
  };

  const registerTile = (node: HTMLElement, slug: string) => {
    tileRefs.set(slug, node);
    let currentSlug = slug;

    if (state.activeSlug === slug && !promoted) {
      if (state.mounted) {
        void ensurePromotedTile(slug, state.activeImageId, false);
      } else {
        requestAnimationFrame(() => {
          if (
            !state.mounted ||
            state.activeSlug !== currentSlug ||
            promoted ||
            tileRefs.get(currentSlug) !== node
          ) {
            return;
          }

          void ensurePromotedTile(currentSlug, state.activeImageId, false);
        });
      }
    }

    return {
      update(nextSlug: string) {
        if (nextSlug === currentSlug) return;

        if (tileRefs.get(currentSlug) === node) {
          tileRefs.delete(currentSlug);
        }

        currentSlug = nextSlug;
        tileRefs.set(currentSlug, node);
      },
      destroy() {
        if (tileRefs.get(currentSlug) === node) {
          tileRefs.delete(currentSlug);
        }
      },
    };
  };

  const releaseAnyPromoted = () => {
    if (!promoted) return;
    releasePromotedTile(promoted);
    promoted = null;
  };

  return {
    registerTile,
    hasThumbCrop,
    thumbCropStyle,
    tileAspectRatio,
    ensurePromotedTile,
    collapsePromotedTile,
    slideToNeighbor,
    resizePromotedNow,
    releaseAnyPromoted,
    get promoted() {
      return promoted;
    },
  };
};
