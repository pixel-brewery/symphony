// #region Imports

import { describe, expect, it } from 'vitest';
import { synthesizePitfallIITia } from './synthesizePitfallIITia';

// #endregion

describe('synthesizePitfallIITia', () => {
  it('uses the poly4 sequence and retains its phase when frame registers repeat', () => {
    // arrange
    const frames = [
      [1, 0, 15],
      [1, 0, 15],
    ] as const;

    // act
    const samples = synthesizePitfallIITia(frames, 31_399.5);

    // assert: seed 1111, polynomial x^4+x+1; sample zero precedes the first clock.
    expect(Array.from(samples.subarray(0, 16), (sample) => (sample > 0 ? 1 : 0))).toEqual([
      1, 1, 1, 1, 1, 0, 0, 0, 1, 0, 0, 1, 1, 0, 1, 0,
    ]);
    expect(samples[525]).toBe(samples[15]);
  });

  it('gates a divide-six tone with poly5 for falling instead of slowing down noise', () => {
    // arrange
    const frames = [[15, 0, 15]] as const;

    // act
    const samples = synthesizePitfallIITia(frames, 31_399.5);

    // assert: first five poly5 gates are high, then three low; only the sixth high gate flips again.
    expect(Array.from(samples.subarray(0, 10), (sample) => (sample > 0 ? 1 : 0))).toEqual([
      1, 1, 1, 0, 0, 0, 0, 0, 0, 1,
    ]);
  });
});
