// #region Imports

import { afterEach, describe, expect, it, vi } from 'vitest';
import { CaliforniaGamesAudio } from './CaliforniaGamesAudio';
import type { ICaliforniaGamesAudioSnapshot } from './ICaliforniaGamesAudioSnapshot';

// #endregion

function audioBrowser() {
  const sources: {
    buffer: unknown;
    loop: boolean;
    onended: (() => void) | null;
    connect: ReturnType<typeof vi.fn>;
    disconnect: ReturnType<typeof vi.fn>;
    start: ReturnType<typeof vi.fn>;
    stop: ReturnType<typeof vi.fn>;
  }[] = [];
  const gain = {
    gain: { value: 0, setValueAtTime: vi.fn() },
    connect: vi.fn(),
    disconnect: vi.fn(),
  };
  const context = {
    state: 'suspended',
    sampleRate: 8000,
    currentTime: 0,
    destination: {},
    createGain: vi.fn(() => gain),
    createBuffer: vi.fn((_channels: number, length: number, rate: number) => {
      const samples = new Float32Array(length);
      return { duration: length / rate, getChannelData: () => samples };
    }),
    createBufferSource: vi.fn(() => {
      const source = {
        buffer: null,
        loop: false,
        onended: null,
        connect: vi.fn(),
        disconnect: vi.fn(),
        start: vi.fn(),
        stop: vi.fn(),
      };
      sources.push(source);
      return source;
    }),
    resume: vi.fn(async () => {
      context.state = 'running';
    }),
    suspend: vi.fn(async () => {
      context.state = 'suspended';
    }),
    close: vi.fn(async () => {
      context.state = 'closed';
    }),
  };
  vi.stubGlobal(
    'AudioContext',
    vi.fn(function () {
      return context;
    }),
  );
  return { context, gain, sources };
}

function snapshot(
  changes: Partial<ICaliforniaGamesAudioSnapshot> = {},
): ICaliforniaGamesAudioSnapshot {
  return {
    music: 'title',
    musicId: 1,
    soundEvents: [],
    status: 'running',
    ...changes,
  };
}

describe('CaliforniaGamesAudio', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('requires a gesture and starts one looping program for a de-duplicated music id', async () => {
    // arrange
    const { context, sources } = audioBrowser();
    const audio = new CaliforniaGamesAudio();

    // act
    audio.update(snapshot());

    // assert
    expect(context.createBufferSource).not.toHaveBeenCalled();

    // act
    await audio.resume();
    audio.update(snapshot());

    // assert
    expect(context.createBufferSource).toHaveBeenCalledOnce();
    expect(sources[0]?.loop).toBe(true);
    audio.dispose();
  });

  it('plays ordered effects once and consumes them while paused', async () => {
    // arrange
    const { context } = audioBrowser();
    const audio = new CaliforniaGamesAudio();
    await audio.resume();
    const withEffect = snapshot({ soundEvents: [{ id: 1, kind: 'jump' }] });

    // act
    audio.update(withEffect);
    audio.update(withEffect);
    audio.update(
      snapshot({
        status: 'paused',
        soundEvents: [...withEffect.soundEvents, { id: 2, kind: 'fall' }],
      }),
    );
    audio.update(snapshot({ soundEvents: [...withEffect.soundEvents, { id: 2, kind: 'fall' }] }));

    // assert
    expect(context.createBufferSource).toHaveBeenCalledTimes(3);
    audio.dispose();
  });

  it('mutes, suspends and disposes every source and context exactly once', async () => {
    // arrange
    const { context, gain, sources } = audioBrowser();
    const audio = new CaliforniaGamesAudio();
    await audio.resume();
    audio.update(snapshot({ soundEvents: [{ id: 1, kind: 'score' }] }));

    // act
    audio.setMuted(true);
    audio.suspend();

    // assert
    expect(gain.gain.setValueAtTime).toHaveBeenLastCalledWith(0, 0);
    expect(sources.every((source) => source.stop.mock.calls.length === 1)).toBe(true);
    expect(context.suspend).toHaveBeenCalledOnce();

    // act
    audio.dispose();
    audio.dispose();
    await audio.resume();

    // assert
    expect(context.close).toHaveBeenCalledOnce();
    expect(context.resume).toHaveBeenCalledOnce();
  });
});
