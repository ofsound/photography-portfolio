import type { GalleryPhoto } from '$lib/types/content';
import type { RowLayoutResult } from '$lib/utils/row-solver';
import type { ThumbnailEntrancePreset } from '$lib/constants/thumbnail-entrance';
import type { GalleryLayoutMode, GalleryImage } from './gallery-scene.types';

export type RegisterTileAction = (
  node: HTMLElement,
  slug: string,
) => { update?: (slug: string) => void; destroy?: () => void };

export type ThumbnailEntranceFx = {
  className: string;
  style: string;
};

export type GalleryGridModel = {
  photos: GalleryPhoto[];
  layoutMode: GalleryLayoutMode;
  colCount: number;
  gap: number;
  uniformRatio: number;
  placeholderCount: number;
  isLoadingMore: boolean;
  galleryRevealed: boolean;
  reducedMotion: boolean;
  withCurrentSearch: (href: string) => string;
  photoPath: (photoSlug: string) => string;
  onOpenPhoto: (event: MouseEvent, slug: string) => void;
  registerTile: RegisterTileAction;
  hasThumbCrop: (img: GalleryImage | null) => boolean;
  thumbCropStyle: (img: GalleryImage | null, containerAspect: number) => string;
  tileAspectRatio: (photo: GalleryPhoto) => number;
  hasMore: boolean;
  loadError: string | null;
  detailOpen: boolean;
  onLoadMore: () => Promise<void>;
  sectionMaxWidthStyle: string;
  coverageRows: number;
  coverageCols: number;
  coverageAspect: number;
  coveragePlaceholderCount: number;
  bindCoverageSection: (node: HTMLElement) => { destroy: () => void };
  rowsResult: RowLayoutResult | null;
  columnsResult: RowLayoutResult | null;
  showThumbnailZoomHover: boolean;
  thumbnailEntrancePreset: ThumbnailEntrancePreset;
  entranceBatchKey: number;
  entranceLocked: boolean;
  entranceFx: (slug: string, fallbackRank: number) => ThumbnailEntranceFx;
  onResolveEntranceOrder: (batchKey: number, orderedSlugs: string[]) => void;
};
