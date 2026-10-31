// #region Imports

import { describe, expect, it } from 'vitest';
import { pitfallIISpritesOverlap } from './pitfallIISpritesOverlap';

// #endregion

describe('pitfallIISpritesOverlap', () => {
  it('ignores transparent overlaps but detects an actual mirrored pixel contact', () => {
    // arrange
    const first = { rows: [128, 128], x: 10, y: 20, mirrored: false };
    const second = { rows: [1, 1], x: 10, y: 20, mirrored: false };

    // act
    const transparent = pitfallIISpritesOverlap(first, second);
    const reflected = pitfallIISpritesOverlap(first, { ...second, mirrored: true });
    const separate = pitfallIISpritesOverlap(first, { ...second, y: 22, mirrored: true });

    // assert
    expect(transparent).toBe(false);
    expect(reflected).toBe(true);
    expect(separate).toBe(false);
  });
});
