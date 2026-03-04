<script lang="ts">
  import GalleryTiles from './GalleryTiles.svelte';
  import type { GalleryPhoto } from '$lib/types/content';

  type GalleryImage = NonNullable<GalleryPhoto['leadImage']>;

  const {
    photos,
    layoutMode,
    colCount,
    gap,
    uniformRatio,
    placeholderCount,
    isLoadingMore,
    galleryRevealed,
    reducedMotion,
    withCurrentSearch,
    onOpenPhoto,
    registerTile,
    hasThumbCrop,
    thumbCropStyle,
    tileAspectRatio,
    hasMore,
    loadError,
    detailOpen,
    onLoadMore,
    sectionMaxWidthStyle,
  } = $props<{
    photos: GalleryPhoto[];
    layoutMode: 'uniform' | 'masonry';
    colCount: number;
    gap: number;
    uniformRatio: number;
    placeholderCount: number;
    isLoadingMore: boolean;
    galleryRevealed: boolean;
    reducedMotion: boolean;
    withCurrentSearch: (href: string) => string;
    onOpenPhoto: (event: MouseEvent, slug: string) => void;
    registerTile: (
      node: HTMLElement,
      slug: string,
    ) => { update?: (slug: string) => void; destroy?: () => void };
    hasThumbCrop: (img: GalleryImage | null) => boolean;
    thumbCropStyle: (
      img: GalleryImage | null,
      containerAspect: number,
    ) => string;
    tileAspectRatio: (photo: GalleryPhoto) => number;
    hasMore: boolean;
    loadError: string | null;
    detailOpen: boolean;
    onLoadMore: () => Promise<void>;
    sectionMaxWidthStyle: string;
  }>();

  const observeLoadSentinel = (
    node: HTMLElement,
    params: {
      hasMore: boolean;
      detailOpen: boolean;
      onLoadMore: () => Promise<void>;
    },
  ) => {
    let observer: IntersectionObserver | null = null;
    let current = params;

    const teardownObserver = () => {
      if (!observer) return;
      observer.disconnect();
      observer = null;
    };

    const setupObserver = () => {
      teardownObserver();
      if (!current.hasMore || current.detailOpen) return;

      observer = new IntersectionObserver(
        (entries) => {
          const [entry] = entries;
          if (!entry?.isIntersecting) return;
          void current.onLoadMore();
        },
        { rootMargin: '600px 0px' },
      );
      observer.observe(node);
    };

    setupObserver();

    return {
      update(next: {
        hasMore: boolean;
        detailOpen: boolean;
        onLoadMore: () => Promise<void>;
      }) {
        current = next;
        setupObserver();
      },
      destroy() {
        teardownObserver();
      },
    };
  };
</script>

<section class="mx-auto w-full px-4 py-5" style={sectionMaxWidthStyle}>
  {#if photos.length === 0}
    <p
      class="py-16 text-center text-sm tracking-[var(--tracking-label)] text-text-muted uppercase"
    >
      No photos found.
    </p>
  {:else}
    <GalleryTiles
      {photos}
      {layoutMode}
      {colCount}
      {gap}
      {uniformRatio}
      {placeholderCount}
      {isLoadingMore}
      {galleryRevealed}
      {reducedMotion}
      {withCurrentSearch}
      {onOpenPhoto}
      {registerTile}
      {hasThumbCrop}
      {thumbCropStyle}
      {tileAspectRatio}
    />

    {#if hasMore}
      <div
        class="h-10 w-full"
        use:observeLoadSentinel={{ hasMore, detailOpen, onLoadMore }}
      ></div>
    {/if}

    {#if isLoadingMore}
      <p
        class="py-4 text-center text-xs tracking-[var(--tracking-label)] text-text-subtle uppercase"
      >
        Loading more
      </p>
    {/if}

    {#if loadError}
      <div class="py-4 text-center text-sm">
        <p>{loadError}</p>
        <button
          class="mt-2 rounded border border-border-strong px-3 py-1 text-xs tracking-[var(--tracking-label)] uppercase"
          type="button"
          onclick={() => void onLoadMore()}>Retry</button
        >
      </div>
    {/if}
  {/if}
</section>
