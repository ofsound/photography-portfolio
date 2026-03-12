export type RegisterTileAction = (
  node: HTMLElement,
  slug: string,
) => {
  update?: (slug: string) => void;
  destroy?: () => void;
};

export type BindGridRootAction = (node: HTMLElement) => {
  destroy?: () => void;
};

export type GalleryViewerController = {
  bindGridRoot: BindGridRootAction;
  registerTile: RegisterTileAction;
  open: (
    slug: string,
    imageId: string | null,
    animate: boolean,
    durationMsOverride?: number,
  ) => Promise<void>;
  close: (animate: boolean) => Promise<void>;
  navigateNeighbor: (
    targetSlug: string,
    direction: 'prev' | 'next',
  ) => Promise<boolean>;
  retarget: (targetSlug: string) => Promise<void>;
  resize: () => Promise<void>;
  release: () => void;
  supportsAdditionalImages: boolean;
  isReady: boolean;
};
