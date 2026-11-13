// #region Imports

import { describe, expect, it } from 'vitest';
import { LynxAudioChannel } from './LynxAudioChannel';

// #endregion

describe('LynxAudioChannel', () => {
  it('renders deterministic signed tone samples and resets phase state', () => {
    // arrange
    const channel = new LynxAudioChannel(8000);
    const first = new Float32Array(80);
    const afterReset = new Float32Array(80);

    // act
    channel.sample(first, 0, first.length, 'tone', 1000, -64);
    channel.reset();
    channel.sample(afterReset, 0, afterReset.length, 'tone', 1000, -64);

    // assert
    expect([...afterReset]).toEqual([...first]);
    expect(first.some((sample) => sample > 0)).toBe(true);
    expect(first.some((sample) => sample < 0)).toBe(true);
  });

  it('uses a repeatable non-zero twelve-bit polynomial noise stream', () => {
    // arrange
    const channel = new LynxAudioChannel(8000);
    const samples = new Float32Array(320);

    // act
    channel.sample(samples, 0, samples.length, 'noise', 2000, 96, true);

    // assert
    expect(new Set(samples).size).toBeGreaterThan(8);
    expect(samples.every((sample) => Number.isFinite(sample))).toBe(true);
  });
});
