// #region Imports

import { describe, expect, it } from 'vitest';
import { nextPitfallSeed } from './nextPitfallSeed';
import { previousPitfallSeed } from './previousPitfallSeed';

// #endregion

describe('previousPitfallSeed', () => {
  it('is a two-sided inverse for every room and restores the reset room after a complete leftward lap', () => {
    // arrange
    let seed = 0xc4;

    // act
    // assert
    for (let value = 1; value <= 255; value += 1) {
      expect(previousPitfallSeed(nextPitfallSeed(value))).toBe(value);
      expect(nextPitfallSeed(previousPitfallSeed(value))).toBe(value);
      seed = previousPitfallSeed(seed);
    }
    expect(seed).toBe(0xc4);
    expect(previousPitfallSeed(0xc4)).toBe(0xe2);
  });
});
