// #region Imports

import { describe, expect, it } from 'vitest';
import { ArcadeTiaAudioChannel } from './ArcadeTiaAudioChannel';

// #endregion

describe('ArcadeTiaAudioChannel', () => {
  it.each([8000, 22050, 31399.5, 44100, 48000])(
    'preserves every sample across independently scheduled register batches at %s Hz',
    (sampleRate) => {
      // arrange
      const frames = Array.from({ length: 60 }, (_, frame): readonly [number, number, number] => [
        ([1, 4, 8, 12, 15] as const)[Math.floor(frame / 12)]!,
        frame % 32,
        frame % 16,
      ]);
      const contiguous = new ArcadeTiaAudioChannel(sampleRate);
      const streamed = new ArcadeTiaAudioChannel(sampleRate);

      // act
      const expected = contiguous.sample(frames);
      const actual = frames.flatMap((frame) => Array.from(streamed.sample([frame])));

      // assert
      expect(actual).toEqual(Array.from(expected));
      expect(actual.length).toBe(Math.ceil(sampleRate));
    },
  );

  it('starts a new session at power-on phase after reset', () => {
    // arrange
    const channel = new ArcadeTiaAudioChannel(48000);
    const frames = [
      [8, 13, 15],
      [4, 9, 8],
    ] as const;
    const first = channel.sample(frames);
    channel.sample(frames);

    // act
    channel.reset();
    const restarted = channel.sample(frames);

    // assert
    expect(restarted).toEqual(first);
  });

  it('advances the oscillator through muted frames without reviving stale phase', () => {
    // arrange
    const audible = new ArcadeTiaAudioChannel(48000);
    const muted = new ArcadeTiaAudioChannel(48000);
    audible.sample([[8, 0, 15]]);
    const silence = muted.sample([[8, 0, 0]]);

    // act
    const expected = audible.sample([[8, 0, 15]]);
    const resumed = muted.sample([[8, 0, 15]]);

    // assert
    expect(silence.every((sample) => sample === 0)).toBe(true);
    expect(resumed).toEqual(expected);
  });
});
