// #region Imports

import { describe, expect, it } from 'vitest';
import { synthesizePitfallIIMusic } from './synthesizePitfallIIMusic';

// #endregion

const SAMPLE_RATE = 48_000;
const FRAME = SAMPLE_RATE / 60;

describe('synthesizePitfallIIMusic', () => {
  it.each([
    [0, 1152],
    [1, 896],
    [2, 896],
    [3, 1344],
  ] as const)(
    'keeps mode %s at its original frame length with independently routable stems',
    (mode, frames) => {
      // arrange
      // act
      const [tones, percussion] = synthesizePitfallIIMusic(mode, SAMPLE_RATE);

      // assert
      expect(tones).toHaveLength(frames * FRAME);
      expect(percussion).toHaveLength(frames * FRAME);
      expect(tones.buffer).not.toBe(percussion.buffer);
      expect(tones.some((sample) => sample !== 0)).toBe(true);
      expect(percussion.some((sample) => sample !== 0)).toBe(true);
      expect(tones.every((sample) => Number.isFinite(sample) && Math.abs(sample) < 0.3)).toBe(true);
    },
  );

  it('starts with the original weighted bass and melody while voice five rests', () => {
    // arrange
    // act
    const [tones] = synthesizePitfallIIMusic(0, SAMPLE_RATE);

    // assert: first dividers 120 and 59, DPC weights 5 and 6, bottom=floor(top/2).
    expect(tones[0]).toBeCloseTo(((61 / 121) * 5 + 0.5 * 6) / 30);
    expect(tones.subarray(1128 * FRAME).every((sample) => sample === 0)).toBe(true);
    // Both initial notes release for their last frame, before the next notes restart their counters.
    expect(tones.subarray(23 * FRAME, 24 * FRAME).every((sample) => sample === 0)).toBe(true);
    expect(tones[24 * FRAME]).toBeCloseTo(((81 / 161) * 5 + 0.5 * 6) / 30);
  });

  it('plays the drum score backwards with single-frame accent gates and six-frame noise decay', () => {
    // arrange
    // act
    const [, percussion] = synthesizePitfallIIMusic(0, SAMPLE_RATE);

    // assert: original F744 driver starts at pattern index 15, then 14, 13.
    expect(Math.abs(percussion[0]!)).toBeCloseTo(8 / 60);
    expect(percussion.subarray(FRAME, 12 * FRAME).every((sample) => sample === 0)).toBe(true);
    expect(Math.abs(percussion[12 * FRAME]!)).toBeCloseTo(5 / 60);
    expect(Math.abs(percussion[13 * FRAME]!)).toBeCloseTo(4 / 60);
    expect(Math.abs(percussion[16 * FRAME]!)).toBeCloseTo(1 / 60);
    expect(percussion.subarray(17 * FRAME, 18 * FRAME).every((sample) => sample === 0)).toBe(true);
  });

  it('honours the shortened balloon percussion loop marker', () => {
    // arrange
    // act
    const [, percussion] = synthesizePitfallIIMusic(3, SAMPLE_RATE);

    // assert: the 0xff at pattern index 3 jumps to 15 after twelve seven-frame ticks.
    for (const frame of [0, 84, 168])
      expect(Math.abs(percussion[frame * FRAME]!)).toBeCloseTo(8 / 60);
    expect(percussion.subarray(85 * FRAME, 98 * FRAME).every((sample) => sample === 0)).toBe(true);
  });
});
