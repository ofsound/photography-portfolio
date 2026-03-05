import { SvelteMap, SvelteSet } from 'svelte/reactivity';
import { galleryDensityStore } from '$lib/stores/gallery-prefs.svelte';
import type { GalleryPhoto } from '$lib/types/content';
import {
  solveColumns,
  solveRows,
  type RowLayoutResult,
} from '$lib/utils/row-solver';
import type { GalleryLayoutMode } from './gallery-scene.types';
import type { GallerySceneState } from './createGallerySceneState.svelte';

type GalleryLayoutOptions = {
  state: GallerySceneState;
  getLayoutMode: () => GalleryLayoutMode;
  getTileAspectRatio: (photo: GalleryPhoto) => number;
};

export const createGalleryLayout = ({
  state,
  getLayoutMode,
  getTileAspectRatio,
}: GalleryLayoutOptions) => {
  let coverageContainerEl: HTMLElement | null = null;

  const coverageRows = $derived.by(() => {
    if (getLayoutMode() !== 'coverage') return 0;

    const requestedRows = Math.max(
      1,
      Math.min(20, Number(galleryDensityStore.value) || 3),
    );

    const photoCount = state.photos.length;
    if (photoCount <= 0) return requestedRows;

    let rows = Math.min(requestedRows, photoCount);
    while (rows > 1) {
      const cols = Math.max(1, Math.ceil(photoCount / rows));
      const placeholders = rows * cols - photoCount;
      if (placeholders < cols) break;
      rows -= 1;
    }

    return rows;
  });

  const coverageCols = $derived(
    coverageRows > 0
      ? Math.max(1, Math.ceil(state.photos.length / coverageRows))
      : 0,
  );

  const coverageTotalCells = $derived(coverageRows * coverageCols);

  const coveragePlaceholderCount = $derived(
    Math.max(0, coverageTotalCells - state.photos.length),
  );

  const coverageCellW = $derived(
    coverageCols > 0 && state.coverageAvailW > 0
      ? (state.coverageAvailW - (coverageCols - 1) * state.gap) / coverageCols
      : 0,
  );

  const coverageCellH = $derived(
    coverageRows > 0 && state.coverageAvailH > 0
      ? (state.coverageAvailH - (coverageRows - 1) * state.gap) / coverageRows
      : 0,
  );

  const coverageAspect = $derived(
    coverageCellH > 0 ? coverageCellW / coverageCellH : 1,
  );

  const rowsRowCount = $derived(
    getLayoutMode() === 'rows'
      ? Math.max(1, Math.min(20, Number(galleryDensityStore.value) || 3))
      : 0,
  );

  const rowsResult = $derived.by<RowLayoutResult | null>(() => {
    if (
      getLayoutMode() !== 'rows' ||
      rowsRowCount === 0 ||
      state.coverageAvailW <= 0 ||
      state.coverageAvailH <= 0
    ) {
      return null;
    }

    const seen = new SvelteSet<string>();
    const rowPhotos = state.photos
      .filter((photo) => photo.leadImage)
      .filter((photo) => {
        if (seen.has(photo.id)) {
          console.warn('[rows] duplicate photo id in input:', photo.id);
          return false;
        }
        seen.add(photo.id);
        return true;
      })
      .map((photo) => ({
        id: photo.id,
        aspect: getTileAspectRatio(photo),
      }));

    if (rowPhotos.length === 0) return null;

    return solveRows(
      rowPhotos,
      rowsRowCount,
      state.coverageAvailW,
      state.coverageAvailH,
      state.gap,
    );
  });

  const rowsAspectMap = $derived.by<SvelteMap<string, number>>(() => {
    const map = new SvelteMap<string, number>();
    if (!rowsResult) return map;

    for (const row of rowsResult.rows) {
      for (const entry of row.photos) {
        map.set(entry.id, entry.displayAspect);
      }
    }

    return map;
  });

  const rowsDisplayAspect = (photo: GalleryPhoto) =>
    rowsAspectMap.get(photo.id) ?? getTileAspectRatio(photo);

  const columnsCols = $derived(
    getLayoutMode() === 'columns'
      ? Math.max(1, Math.min(20, Number(galleryDensityStore.value) || 3))
      : 0,
  );

  const columnsResult = $derived.by<RowLayoutResult | null>(() => {
    if (
      getLayoutMode() !== 'columns' ||
      columnsCols === 0 ||
      state.coverageAvailW <= 0 ||
      state.coverageAvailH <= 0
    ) {
      return null;
    }

    const seen = new SvelteSet<string>();
    const colPhotos = state.photos
      .filter((photo) => photo.leadImage)
      .filter((photo) => {
        if (seen.has(photo.id)) {
          console.warn('[columns] duplicate photo id in input:', photo.id);
          return false;
        }
        seen.add(photo.id);
        return true;
      })
      .map((photo) => ({
        id: photo.id,
        aspect: getTileAspectRatio(photo),
      }));

    if (colPhotos.length === 0) return null;

    return solveColumns(
      colPhotos,
      columnsCols,
      state.coverageAvailW,
      state.coverageAvailH,
      state.gap,
    );
  });

  const columnsAspectMap = $derived.by<SvelteMap<string, number>>(() => {
    const map = new SvelteMap<string, number>();
    if (!columnsResult) return map;

    for (const col of columnsResult.rows) {
      for (const entry of col.photos) {
        map.set(entry.id, entry.displayAspect);
      }
    }

    return map;
  });

  const columnsDisplayAspect = (photo: GalleryPhoto) =>
    columnsAspectMap.get(photo.id) ?? getTileAspectRatio(photo);

  const measureCoverageContainer = () => {
    if (!coverageContainerEl) return;
    state.coverageAvailW = coverageContainerEl.clientWidth;
    state.coverageAvailH = coverageContainerEl.clientHeight;
  };

  const bindCoverageSection = (node: HTMLElement) => {
    coverageContainerEl = node;
    measureCoverageContainer();

    const observer = new ResizeObserver(() => {
      measureCoverageContainer();
    });

    observer.observe(node);

    return {
      destroy() {
        if (coverageContainerEl === node) {
          coverageContainerEl = null;
        }
        observer.disconnect();
      },
    };
  };

  return {
    get coverageRows() {
      return coverageRows;
    },
    get coverageCols() {
      return coverageCols;
    },
    get coverageAspect() {
      return coverageAspect;
    },
    get coveragePlaceholderCount() {
      return coveragePlaceholderCount;
    },
    get rowsResult() {
      return rowsResult;
    },
    get columnsResult() {
      return columnsResult;
    },
    rowsDisplayAspect,
    columnsDisplayAspect,
    bindCoverageSection,
  };
};
