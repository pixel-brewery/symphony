// #region Imports

import type { IMagnificationCell } from './IMagnificationCell';
import type { IMagnificationPlacement } from './IMagnificationPlacement';
import { magnificationFalloff } from './magnificationFalloff';

// #endregion

/**
 * Solves a whole track for one pointer position: how far each cell grows, and how far it has to
 * move so that no two cells overlap and the material under the pointer stays under the pointer.
 *
 * The track is treated as a monotone map from resting coordinate to screen coordinate whose local
 * stretch is the cell's scale inside a cell and `1` in the gaps between them. Two consequences do
 * the work. First, gaps are unchanged by magnification, so they cancel out of the position
 * difference: a cell's displacement depends only on the growth of the cells before it plus half of
 * its own - `offset = prefixGrowth + growth / 2 + shift` - and the caller therefore never has to
 * measure spacing, `justify-content` or pitch, and a row of unequal cells is correct for free.
 * Second, the single free constant `shift` is fixed by demanding that the map has the pointer as a
 * fixed point. That is the aiming guarantee: the derivative of the aimed-at position with respect
 * to the pointer position is exactly zero, so the target grows underneath the cursor instead of
 * sliding out from under it, and Fitts's index of difficulty falls rather than rises. Anchoring on
 * the pointer rather than on the hovered cell's centre matters - pinning the centre would jump the
 * row by half a cell every time the pointer crossed a cell boundary, while this is continuous
 * across boundaries because the fraction term reaches the neighbouring gap's value exactly at the
 * cell edge. The price, paid deliberately, is that cells away from the pointer are pushed outward
 * by the cumulative growth between them and the pointer; that push is bounded by the total growth,
 * which is why `radius` and `maxScale` are kept modest.
 *
 * `cells` must be ordered by ascending `centre` - measured order, not DOM order, so the solver is
 * automatically right under RTL and reversed flex directions. `amplitude` scales the whole field
 * between `0` (identity) and `1` (full magnification) and is the caller's fade-in as the pointer
 * approaches the track. The returned placements are parallel to `cells`.
 *
 * @param cells - The track's participants, measured at rest and ordered by centre.
 * @param pointer - The pointer's main-axis coordinate, unclamped, in the cells' coordinate space.
 * @param radius - Main-axis reach of the field in pixels; beyond it a cell stays at rest.
 * @param amplitude - Field strength between 0 and 1.
 * @returns One placement per cell, in the order the cells were given.
 * @public
 */
export function magnificationPlacements(
  cells: readonly IMagnificationCell[],
  pointer: number,
  radius: number,
  amplitude: number,
): readonly IMagnificationPlacement[] {
  const strength = Math.min(Math.max(amplitude, 0), 1);
  const scales: number[] = [];
  const growths: number[] = [];
  for (const cell of cells) {
    const gain = Math.max(cell.maxScale, 1) - 1;
    const scale = 1 + gain * strength * magnificationFalloff(pointer - cell.centre, radius);
    scales.push(scale);
    growths.push(cell.extent * (scale - 1));
  }

  const shift = anchorShift(cells, growths, pointer);
  const placements: IMagnificationPlacement[] = [];
  let prefixGrowth = 0;
  for (const [index, scale] of scales.entries()) {
    const growth = growths.at(index) ?? 0;
    placements.push({ offset: prefixGrowth + growth / 2 + shift, scale });
    prefixGrowth += growth;
  }
  return placements;
}

/**
 * The one translation applied to the whole track, chosen so the point the pointer rests on does not
 * move. Inside a cell the pointer sits at fraction `f` of the resting extent, and that material
 * point is carried `prefixGrowth + f * growth` away by the growth before and under it, so the track
 * is pulled back by exactly that. In a gap, before the row or past its end there is nothing to
 * stretch, so only the growth already passed counts.
 */
function anchorShift(
  cells: readonly IMagnificationCell[],
  growths: readonly number[],
  pointer: number,
): number {
  let prefixGrowth = 0;
  for (const [index, cell] of cells.entries()) {
    const start = cell.centre - cell.extent / 2;
    if (pointer < start) return -prefixGrowth;
    const growth = growths.at(index) ?? 0;
    if (pointer <= start + cell.extent) {
      const fraction = cell.extent > 0 ? (pointer - start) / cell.extent : 0;
      return -prefixGrowth - fraction * growth;
    }
    prefixGrowth += growth;
  }
  return -prefixGrowth;
}
