// #region Imports

import { describe, expect, it } from 'vitest';
import { movePaletteSelection } from './movePaletteSelection';

// #endregion

describe('movePaletteSelection', () => {
  it.each([
    [0, 3, 'next', 1],
    [2, 3, 'next', 0],
    [1, 3, 'previous', 0],
    [0, 3, 'previous', 2],
    [7, 3, 'next', 0],
    [0, 0, 'next', 0],
    [0, 1, 'previous', 0],
  ] as const)('moves from %i of %i rows %s to %i', (index, count, direction, expected) => {
    // act
    const selected = movePaletteSelection(index, count, direction);

    // assert
    expect(selected).toBe(expected);
  });
});
