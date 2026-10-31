// #region Imports

import { describe, expect, it } from 'vitest';
import type { IMagnificationCell } from './';
import { magnificationPlacements } from './';

// #endregion

const EXTENT = 44;
const GAP = 4;
const RADIUS = 96;

/** The real dock: four items, a separator, one more item, laid out left to right with a 4px gap. */
function dock(): readonly IMagnificationCell[] {
  const extents = [EXTENT, EXTENT, EXTENT, EXTENT, 9, EXTENT];
  const cells: IMagnificationCell[] = [];
  let start = 0;
  for (const extent of extents) {
    cells.push({ centre: start + extent / 2, extent, maxScale: extent === 9 ? 1 : 1.35 });
    start += extent + GAP;
  }
  return cells;
}

/** Painted edges: resting box, moved by the placement, grown about its own centre. */
function edges(cells: readonly IMagnificationCell[], pointer: number, amplitude = 1) {
  const placements = magnificationPlacements(cells, pointer, RADIUS, amplitude);
  return cells.map((cell, index) => {
    const placement = placements.at(index);
    const offset = placement?.offset ?? 0;
    const scale = placement?.scale ?? 1;
    return {
      start: cell.centre + offset - (cell.extent * scale) / 2,
      end: cell.centre + offset + (cell.extent * scale) / 2,
      scale,
    };
  });
}

describe('magnificationPlacements', () => {
  it('raises the cell under the pointer and tapers over its neighbours', () => {
    // arrange
    const cells = dock();

    // act
    const placements = magnificationPlacements(cells, 118, RADIUS, 1);

    // assert
    expect(placements.map((placement) => Number(placement.scale.toFixed(3)))).toEqual([
      1, 1.175, 1.35, 1.175, 1, 1,
    ]);
  });

  it('keeps every gap intact while the row grows', () => {
    // arrange
    const cells = dock();

    // act
    const sweep = [-40, 0, 22, 41, 46, 70, 95, 118, 190, 240, 300];

    // assert
    for (const pointer of sweep) {
      const painted = edges(cells, pointer);
      for (let index = 1; index < painted.length; index += 1) {
        const previous = painted.at(index - 1);
        const current = painted.at(index);
        expect((current?.start ?? 0) - (previous?.end ?? 0)).toBeCloseTo(GAP, 9);
      }
    }
  });

  it('holds the point under the pointer still, inside a cell and across the gap between two', () => {
    // arrange
    const cells = dock();

    // act
    const sweep = [0.5, 10, 22, 33, 43.9, 45, 46, 47.5, 118, 214, 260];

    // assert
    for (const pointer of sweep) {
      const painted = edges(cells, pointer);
      // Where the pointer lands in the resting row, and where that same material point is painted.
      let aimed = pointer;
      for (const [index, cell] of cells.entries()) {
        const start = cell.centre - cell.extent / 2;
        if (pointer < start || pointer > start + cell.extent) continue;
        const box = painted.at(index);
        const fraction = (pointer - start) / cell.extent;
        aimed = (box?.start ?? 0) + fraction * ((box?.end ?? 0) - (box?.start ?? 0));
        break;
      }
      expect(aimed).toBeCloseTo(pointer, 9);
    }
  });

  it('slides a separator with the row without ever growing it', () => {
    // arrange
    const cells = dock();

    // act
    const placements = magnificationPlacements(cells, 214, RADIUS, 1);
    const separator = placements.at(4);

    // assert
    expect(separator?.scale).toBe(1);
    expect(separator?.offset ?? 0).toBeLessThan(0);
  });

  it('fades out to an untouched row as the amplitude falls to zero', () => {
    // arrange
    const cells = dock();

    // act
    const resting = magnificationPlacements(cells, 118, RADIUS, 0);
    const faint = magnificationPlacements(cells, 118, RADIUS, 0.25);

    // assert
    expect(resting.every((placement) => placement.scale === 1 && placement.offset === 0)).toBe(
      true,
    );
    expect(faint.at(2)?.scale).toBeCloseTo(1.0875, 9);
  });

  it('pushes the row away from a pointer parked past its end without magnifying anything', () => {
    // arrange
    const cells = dock();

    // act
    const placements = magnificationPlacements(cells, 500, RADIUS, 1);

    // assert
    expect(placements.every((placement) => placement.scale === 1)).toBe(true);
    expect(placements.every((placement) => placement.offset === 0)).toBe(true);
  });
});
