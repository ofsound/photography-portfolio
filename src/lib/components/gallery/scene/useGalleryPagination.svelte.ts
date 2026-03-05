import { SvelteSet } from 'svelte/reactivity';
import type { GalleryPhoto } from '$lib/types/content';
import type { GalleryLayoutMode } from './gallery-scene.types';
import type { GallerySceneState } from './createGallerySceneState.svelte';

type GalleryPaginationOptions = {
  state: GallerySceneState;
  getLayoutMode: () => GalleryLayoutMode;
  buildFeedUrl: () => string;
};

export const createGalleryPagination = ({
  state,
  getLayoutMode,
  buildFeedUrl,
}: GalleryPaginationOptions) => {
  const loadNextPage = async () => {
    const layoutMode = getLayoutMode();
    if (
      state.isLoadingMore ||
      !state.hasMore ||
      state.activeSlug ||
      layoutMode === 'coverage' ||
      layoutMode === 'rows' ||
      layoutMode === 'columns'
    ) {
      return;
    }

    state.isLoadingMore = true;
    state.loadError = null;

    try {
      const response = await fetch(buildFeedUrl());
      if (!response.ok) {
        throw new Error('request-failed');
      }

      const payload = (await response.json()) as {
        photos: GalleryPhoto[];
        hasMore: boolean;
        page: number;
      };

      const existing = new SvelteSet(state.photos.map((photo) => photo.id));
      const nextPhotos = payload.photos.filter(
        (photo) => !existing.has(photo.id),
      );
      state.photos = [...state.photos, ...nextPhotos];
      state.currentPage = payload.page;
      state.hasMore = payload.hasMore;
    } catch {
      state.loadError = 'Could not load more photos.';
    } finally {
      state.isLoadingMore = false;
    }
  };

  return {
    loadNextPage,
  };
};
