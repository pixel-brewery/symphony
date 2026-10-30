// #region Imports

import { describe, expect, it } from 'vitest';
import { synthesizePitfallIIEffect } from './synthesizePitfallIIEffect';

// #endregion

const SAMPLE_RATE = 48_000;
const FRAME = SAMPLE_RATE / 60;

describe('synthesizePitfallIIEffect', () => {
  it.each([
    ['jump', 15],
    ['pop', 15],
    ['fall', 16],
    ['treasure', 31],
    ['checkpoint', 31],
  ] as const)('keeps the cartridge countdown length for %s', (kind, frames) => {
    // arrange
    // act
    const samples = synthesizePitfallIIEffect(kind, SAMPLE_RATE);

    // assert
    expect(samples).toHaveLength(frames * FRAME);
    expect(samples.every((sample) => Number.isFinite(sample) && Math.abs(sample) <= 0.25)).toBe(
      true,
    );
  });

  it('uses the pre-decrement envelope, including the silent first fall and final treasure frames', () => {
    // arrange
    // act
    const fall = synthesizePitfallIIEffect('fall', SAMPLE_RATE);
    const treasure = synthesizePitfallIIEffect('treasure', SAMPLE_RATE);
    const checkpoint = synthesizePitfallIIEffect('checkpoint', SAMPLE_RATE);
    const pop = synthesizePitfallIIEffect('pop', SAMPLE_RATE);

    // assert
    expect(fall.subarray(0, FRAME).every((sample) => sample === 0)).toBe(true);
    expect(Math.abs(fall[FRAME]!)).toBe(0.25);
    expect(Math.abs(fall[15 * FRAME]!)).toBeCloseTo(1 / 60);
    for (const samples of [treasure, checkpoint]) {
      expect(Math.abs(samples[0]!)).toBe(0.25);
      expect(Math.abs(samples[FRAME]!)).toBe(0.25);
      expect(Math.abs(samples[2 * FRAME]!)).toBeCloseTo(14 / 60);
      expect(samples.subarray(30 * FRAME).every((sample) => sample === 0)).toBe(true);
    }
    expect(Math.abs(pop[0]!)).toBe(0.25);
    expect(Math.abs(pop[14 * FRAME]!)).toBeCloseTo(1 / 60);
  });

  it('keeps checkpoint and treasure at their distinct pure-tone divisions', () => {
    // arrange
    const checkpoint = synthesizePitfallIIEffect('checkpoint', SAMPLE_RATE);
    const treasure = synthesizePitfallIIEffect('treasure', SAMPLE_RATE);
    const crossings = (samples: Float32Array) =>
      samples
        .subarray(0, FRAME)
        .reduce(
          (count, sample, index) =>
            count + (index > 0 && Math.sign(sample) !== Math.sign(samples[index - 1]!) ? 1 : 0),
          0,
        );

    // act
    // assert
    expect(crossings(checkpoint)).toBe(58);
    expect(crossings(treasure)).toBe(19);
  });

  it('does not invent a separate splash, injury, balloon pickup or victory effect', () => {
    // arrange
    // act
    // assert
    for (const kind of ['splash', 'hurt', 'balloon', 'victory'] as const)
      expect(synthesizePitfallIIEffect(kind, SAMPLE_RATE)).toHaveLength(0);
  });

  it('rejects invalid sample rates before allocating an effect buffer', () => {
    // arrange
    // act
    // assert
    for (const rate of [0, NaN, Infinity, 7999, 192001])
      expect(() => synthesizePitfallIIEffect('jump', rate)).toThrow(RangeError);
  });
});
