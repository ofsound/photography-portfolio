import type { GalleryViewerController } from './gallery-viewer-controller';
import { createGalleryTileAnimator } from './useGalleryTileAnimator.svelte';

type TileAnimator = ReturnType<typeof createGalleryTileAnimator>;

type CreateGalleryClassicViewerOptions = {
  tileAnimator: TileAnimator;
};

const noopGridRoot = () => ({
  destroy() {
    // Classic viewer does not need the grid root.
  },
});

export const createGalleryClassicViewer = ({
  tileAnimator,
}: CreateGalleryClassicViewerOptions): GalleryViewerController => ({
  bindGridRoot: noopGridRoot,
  registerTile: tileAnimator.registerTile,
  async open(slug, imageId, animate, durationMsOverride) {
    await tileAnimator.ensurePromotedTile(
      slug,
      imageId,
      animate,
      durationMsOverride,
    );
  },
  async close(animate) {
    await tileAnimator.collapsePromotedTile(animate);
  },
  async navigateNeighbor(targetSlug, direction) {
    return tileAnimator.slideToNeighbor(targetSlug, direction);
  },
  async retarget(targetSlug) {
    await tileAnimator.ensurePromotedTile(targetSlug, null, false, 260);
  },
  async resize() {
    await tileAnimator.resizePromotedNow();
  },
  release() {
    tileAnimator.releaseAnyPromoted();
  },
  supportsAdditionalImages: true,
  get isReady() {
    return Boolean(tileAnimator.promoted);
  },
});
