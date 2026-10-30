// #region Imports

import { describe, expect, it } from 'vitest';
import { nextPitfallSeed } from './nextPitfallSeed';

// #endregion

describe('nextPitfallSeed', () => {
  it('follows the original rightward LFSR cycle without zero or early repetition', () => {
    // arrange
    let seed = 0xc4;
    const seeds: number[] = [];

    // act
    for (let index = 0; index < 255; index += 1) {
      seeds.push(seed);
      seed = nextPitfallSeed(seed);
    }

    // assert
    expect(seed).toBe(0xc4);
    expect(new Set(seeds).size).toBe(255);
    expect(seeds).not.toContain(0);
    expect(seeds.slice(0, 8)).toEqual([196, 137, 18, 37, 75, 151, 46, 92]);
  });
});
