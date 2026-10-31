// #region Imports

import { afterEach, describe, expect, it, vi } from 'vitest';
import { RiverRaidGame } from '../model/RiverRaidGame';
import { RiverRaidAudio } from './RiverRaidAudio';

// #endregion

function audioBrowser() {
  const sources: {
    stop: ReturnType<typeof vi.fn>;
    disconnect: ReturnType<typeof vi.fn>;
    start: ReturnType<typeof vi.fn>;
  }[] = [];
  const gain = {
    gain: { value: 0, setValueAtTime: vi.fn() },
    connect: vi.fn(),
    disconnect: vi.fn(),
  };
  const context = {
    state: 'suspended',
    sampleRate: 48000,
    currentTime: 0,
    destination: {},
    createGain: vi.fn(() => gain),
    createBuffer: vi.fn((_channels: number, length: number, rate: number) => ({
      duration: length / rate,
      getChannelData: () => new Float32Array(length),
    })),
    createBufferSource: vi.fn(() => {
      const source = {
        buffer: null,
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

describe('RiverRaidAudio', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('requires a gesture and schedules each simulation register batch only once', async () => {
    // arrange
    const { context } = audioBrowser();
    const audio = new RiverRaidAudio();
    const game = new RiverRaidGame();
    game.setInput('fire', true);
    game.step(50);

    // act
    audio.update(game.snapshot);

    // assert
    expect(context.createBufferSource).not.toHaveBeenCalled();

    // act
    await audio.resume();
    game.step(50);
    audio.update(game.snapshot);
    audio.update(game.snapshot);

    // assert
    expect(context.createBufferSource).toHaveBeenCalledOnce();
    expect(context.createBuffer.mock.calls[0]?.[1]).toBe(2400);
    audio.dispose();
  });

  it('mutes without replaying old cues and releases pending sources on suspend and disposal', async () => {
    // arrange
    const { context, gain, sources } = audioBrowser();
    const audio = new RiverRaidAudio();
    const game = new RiverRaidGame();
    await audio.resume();
    game.setInput('up', true);
    game.step(50);
    audio.update(game.snapshot);

    // act
    audio.setMuted(true);
    audio.suspend();

    // assert
    expect(gain.gain.setValueAtTime).toHaveBeenLastCalledWith(0, 0);
    expect(sources[0]?.stop).toHaveBeenCalledOnce();
    expect(context.suspend).toHaveBeenCalledOnce();

    // act
    audio.dispose();
    audio.dispose();
    await audio.resume();

    // assert
    expect(context.close).toHaveBeenCalledOnce();
    expect(context.resume).toHaveBeenCalledOnce();
  });
  it('discards queued backlog without replaying a previously consumed register frame', async () => {
    // arrange
    const { context } = audioBrowser();
    const audio = new RiverRaidAudio();
    const game = new RiverRaidGame();
    await audio.resume();
    game.setInput('up', true);
    game.step(250);
    audio.update(game.snapshot);

    // act
    game.step(1000 / 60);
    const latest = game.snapshot;
    audio.update(latest);
    audio.update(latest);

    // assert
    expect(context.createBuffer.mock.calls.map((call) => call[1])).toEqual([12000, 800]);
    expect(context.createBufferSource).toHaveBeenCalledTimes(2);
    audio.dispose();
  });
});
