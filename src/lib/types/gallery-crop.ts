export type GalleryCropLayoutMode =
  | 'uniform'
  | 'masonry'
  | 'coverage'
  | 'rows'
  | 'columns';

export type GalleryCropConfig = {
  layoutMode: GalleryCropLayoutMode;
  uniformThumbRatio: number;
};

export type GalleryCropConfigByGalleryId = Record<string, GalleryCropConfig>;
