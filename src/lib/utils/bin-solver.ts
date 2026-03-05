/**
 * Bin-packing solver for the BINS gallery layout mode.
 *
 * Partitions N photos into R equal-height rows so the total grid
 * fills the viewport exactly. Photos may be freely reordered across
 * rows to minimise the worst-case crop (scale-factor deviation from 1).
 *
 * Algorithm:
 *   1. LPT (Longest Processing Time) initial assignment — widest photos first,
 *      each placed into the row whose current total width is furthest below target.
 *   2. Iterative pairwise swap improvement — keep swapping photos between rows
 *      whenever it reduces max |s − 1| across all rows.  Capped at MAX_SWAP_PASSES.
 */

export type BinPhoto = { id: string; aspect: number };

export type BinEntry = {
    id: string;
    /** Original natural aspect ratio of the photo. */
    aspect: number;
    /** Adjusted aspect ratio the photo should be displayed at (= aspect × rowScale). */
    displayAspect: number;
};

export type BinRow = {
    photos: BinEntry[];
    /** Scale factor applied to all photos in this row.  1 = no crop. */
    scale: number;
};

export type BinResult = {
    rows: BinRow[];
    rowHeight: number;
};

const MAX_SWAP_PASSES = 6;
const MAX_SWAPS_PER_PASS = 200;

/**
 * Compute the scale factor for a single row.
 * scale < 1 → photos cropped horizontally (too wide naturally).
 * scale > 1 → photos cropped vertically (too narrow naturally).
 */
function rowScale(
    rowPhotos: BinPhoto[],
    rowHeight: number,
    targetWidth: number,
    gap: number,
): number {
    if (rowPhotos.length === 0) return 1;
    const naturalWidth =
        rowPhotos.reduce((sum, p) => sum + p.aspect * rowHeight, 0) +
        (rowPhotos.length - 1) * gap;
    return naturalWidth > 0 ? targetWidth / naturalWidth : 1;
}

/** Max |scale − 1| across all rows (the metric we minimise). */
function maxDeviation(rows: BinPhoto[][], rowHeight: number, targetWidth: number, gap: number): number {
    let worst = 0;
    for (const row of rows) {
        const s = rowScale(row, rowHeight, targetWidth, gap);
        worst = Math.max(worst, Math.abs(s - 1));
    }
    return worst;
}

/**
 * LPT-style initial assignment: sort photos widest-first, then greedily
 * place each into the row with the most remaining capacity.
 */
function lptAssign(photos: BinPhoto[], rowCount: number, rowHeight: number, targetWidth: number, gap: number): BinPhoto[][] {
    const sorted = [...photos].sort((a, b) => b.aspect - a.aspect);
    const rows: BinPhoto[][] = Array.from({ length: rowCount }, () => []);
    const rowWidths: number[] = new Array(rowCount).fill(0);

    for (const photo of sorted) {
        // Find the row with the smallest current width (most room left).
        let bestRow = 0;
        let bestWidth = rowWidths[0];
        for (let r = 1; r < rowCount; r++) {
            if (rowWidths[r] < bestWidth) {
                bestWidth = rowWidths[r];
                bestRow = r;
            }
        }
        rows[bestRow].push(photo);
        rowWidths[bestRow] += photo.aspect * rowHeight + gap;
    }

    return rows;
}

/**
 * Iterative pairwise-swap improvement.
 * For every pair of photos in different rows, if swapping them reduces the
 * worst-case deviation, commit the swap.  Repeat until no improvement is found.
 */
function swapImprove(
    rows: BinPhoto[][],
    rowHeight: number,
    targetWidth: number,
    gap: number,
): void {
    for (let pass = 0; pass < MAX_SWAP_PASSES; pass++) {
        let improved = false;
        let swaps = 0;
        const currentWorst = maxDeviation(rows, rowHeight, targetWidth, gap);

        for (let rA = 0; rA < rows.length && swaps < MAX_SWAPS_PER_PASS; rA++) {
            for (let rB = rA + 1; rB < rows.length && swaps < MAX_SWAPS_PER_PASS; rB++) {
                for (let iA = 0; iA < rows[rA].length && swaps < MAX_SWAPS_PER_PASS; iA++) {
                    for (let iB = 0; iB < rows[rB].length && swaps < MAX_SWAPS_PER_PASS; iB++) {
                        // Swap
                        const tmp = rows[rA][iA];
                        rows[rA][iA] = rows[rB][iB];
                        rows[rB][iB] = tmp;

                        const newWorst = maxDeviation(rows, rowHeight, targetWidth, gap);
                        if (newWorst < currentWorst - 1e-9) {
                            improved = true;
                            swaps++;
                            // keep swap, continue
                        } else {
                            // revert
                            rows[rB][iB] = rows[rA][iA];
                            rows[rA][iA] = tmp;
                        }
                    }
                }
            }
        }

        if (!improved) break;
    }
}

/**
 * Also try moving a photo from one row to another (not swapping).
 * This handles the case where rows should have different photo counts.
 */
function moveImprove(
    rows: BinPhoto[][],
    rowHeight: number,
    targetWidth: number,
    gap: number,
): void {
    for (let pass = 0; pass < MAX_SWAP_PASSES; pass++) {
        let improved = false;
        const currentWorst = maxDeviation(rows, rowHeight, targetWidth, gap);

        for (let rFrom = 0; rFrom < rows.length; rFrom++) {
            if (rows[rFrom].length <= 1) continue; // don't empty a row

            for (let i = 0; i < rows[rFrom].length; i++) {
                for (let rTo = 0; rTo < rows.length; rTo++) {
                    if (rTo === rFrom) continue;

                    // Move photo from rFrom to rTo
                    const [photo] = rows[rFrom].splice(i, 1);
                    rows[rTo].push(photo);

                    const newWorst = maxDeviation(rows, rowHeight, targetWidth, gap);
                    if (newWorst < currentWorst - 1e-9) {
                        improved = true;
                        break; // restart inner loops since indices shifted
                    } else {
                        // revert
                        rows[rTo].pop();
                        rows[rFrom].splice(i, 0, photo);
                    }
                }

                if (improved) break;
            }

            if (improved) break;
        }

        if (!improved) break;
    }
}

/**
 * Main solver entry point.
 *
 * @param photos  Array of { id, aspect }. aspect = width/height of the original image.
 * @param rowCount  Number of rows (R) — set by the zoom control.
 * @param viewportWidth  Available width in px.
 * @param viewportHeight  Available height in px.
 * @param gap  Gap between tiles in px.
 * @returns  BinResult — R rows, each with ordered photo entries including displayAspect.
 */
export function solveBins(
    photos: BinPhoto[],
    rowCount: number,
    viewportWidth: number,
    viewportHeight: number,
    gap: number,
): BinResult {
    const R = Math.max(1, Math.min(photos.length, rowCount));
    const rowHeight = (viewportHeight - (R - 1) * gap) / R;

    if (photos.length === 0) {
        return { rows: Array.from({ length: R }, () => ({ photos: [], scale: 1 })), rowHeight };
    }

    // If only 1 row or 1 photo per row, no optimisation needed.
    const rows = lptAssign(photos, R, rowHeight, viewportWidth, gap);

    if (R > 1 && photos.length > R) {
        swapImprove(rows, rowHeight, viewportWidth, gap);
        moveImprove(rows, rowHeight, viewportWidth, gap);
        // Second round after moves may have shifted balance
        swapImprove(rows, rowHeight, viewportWidth, gap);
    }

    // Build result with display aspect ratios.
    const result: BinRow[] = rows.map((row) => {
        const s = rowScale(row, rowHeight, viewportWidth, gap);
        return {
            scale: s,
            photos: row.map((p) => ({
                id: p.id,
                aspect: p.aspect,
                displayAspect: p.aspect * s,
            })),
        };
    });

    return { rows: result, rowHeight };
}

/**
 * Transpose wrapper: solve for equal-width *columns* that fill the viewport.
 *
 * Strategy: invert every aspect ratio (1/a), swap vw↔vh, call solveBins
 * (which solves rows), then invert displayAspect values back so the
 * caller gets correct landscape/portrait ratios for column layout.
 */
export function solveColumns(
    photos: { id: string; aspect: number }[],
    numCols: number,
    viewportW: number,
    viewportH: number,
    gap: number,
): BinResult {
    const transposed = photos.map((p) => ({ id: p.id, aspect: 1 / p.aspect }));
    const result = solveBins(transposed, numCols, viewportH, viewportW, gap);
    return {
        rows: result.rows.map((row) => ({
            scale: row.scale,
            photos: row.photos.map((entry) => ({
                id: entry.id,
                aspect: 1 / entry.aspect,
                displayAspect: 1 / entry.displayAspect,
            })),
        })),
        rowHeight: result.rowHeight,
    };
}
