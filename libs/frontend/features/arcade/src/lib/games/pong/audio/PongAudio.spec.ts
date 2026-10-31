// #region Imports

import { afterEach, describe, expect, it, vi } from 'vitest';
import type { IPongSnapshot } from '../model/IPongSnapshot';
import { PongGame } from '../model/PongGame';
import { PongAudio } from './PongAudio';

// #endregion

function createHarness() {
  const parameter = () => ({
    value: 0,
    cancelScheduledValues: vi.fn(),
    setValueAtTime: vi.fn(),
    setTargetAtTime: vi.fn(),
  });
  const gains = Array.from({ length: 2 }, () => ({
    gain: parameter(),
    connect: vi.fn(),
    disconnect: vi.fn(),
  }));
  const createBuffer = (channels: number, length: number, sampleRate: number) => {
    const data = Array.from({ length: channels }, () => new Float32Array(length));
    return {
      numberOfChannels: channels,
      duration: length / sampleRate,
      getChannelData: (channel: number) => data[channel]!,
    };
  };
  const source = () => ({
    buffer: null as ReturnType<typeof createBuffer> | null,
    loop: false,
    loopStart: 0,
    loopEnd: 0,
    onended: null as (() => void) | null,
    connect: vi.fn(),
    disconnect: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
  });
  const sources: ReturnType<typeof source>[] = [];
  const splitters: { connect: ReturnType<typeof vi.fn>; disconnect: ReturnType<typeof vi.fn> }[] =
    [];
  let gainIndex = 0;
  const context = {
    state: 'running',
    currentTime: 10,
    sampleRate: 48_000,
    destination: {},
    createGain: vi.fn(() => gains[gainIndex++]!),
    createBuffer: vi.fn(createBuffer),
    createBufferSource: vi.fn(() => {
      const value = source();
      sources.push(value);
      return value;
    }),
    createChannelSplitter: vi.fn(() => {
      const splitter = { connect: vi.fn(), disconnect: vi.fn() };
      splitters.push(splitter);
      return splitter;
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
  const constructor = vi.fn(function () {
    return context;
  });
  vi.stubGlobal('AudioContext', constructor);
  return {
    constructor,
    context,
    gains,
    sources,
    splitters,
    music: () => sources.filter((value) => value.buffer?.numberOfChannels === 2),
    effects: () => sources.filter((value) => value.buffer?.numberOfChannels === 1),
  };
}

function snapshot(overrides: Partial<IPongSnapshot> = {}): IPongSnapshot {
  return { ...new PongGame().snapshot, status: 'playing', ...overrides };
}

describe('PongAudio', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('unlocks only after a gesture and consumes previous events without replay', async () => {
    // arrange
    const harness = createHarness();
    const audio = new PongAudio();
    const state = snapshot({
      soundEvents: [{ id: 1, kind: 'score', frame: 0, line: 0, ballCounter: 252, verticalLoad: 7 }],
    });
    // act
    audio.update(state);
    expect(harness.constructor).not.toHaveBeenCalled();
    await audio.resume();
    audio.update(state);
    // assert
    expect(harness.sources).toHaveLength(0);
    audio.dispose();
  });

  it('plays each gate once, retains mute and releases active sources on reset and route exit', async () => {
    // arrange
    const harness = createHarness();
    const audio = new PongAudio();
    await audio.resume();
    const event = {
      id: 1,
      kind: 'score' as const,
      frame: 0,
      line: 0,
      ballCounter: 252,
      verticalLoad: 7,
    };
    // act
    audio.setMuted(true);
    audio.update(snapshot({ soundEvents: [event] }));
    audio.setMuted(false);
    audio.update(snapshot({ soundEvents: [event] }));
    audio.reset();
    audio.update(snapshot({ soundEvents: [{ ...event, id: 2 }] }));
    audio.suspend();
    await audio.resume();
    audio.dispose();
    audio.dispose();
    await audio.resume();
    // assert
    expect(harness.sources).toHaveLength(2);
    for (const source of harness.sources) expect(source.stop).toHaveBeenCalledOnce();
    expect(harness.gains[0]!.gain.setTargetAtTime).toHaveBeenCalledWith(0, 10, 0.008);
    expect(harness.context.suspend).toHaveBeenCalledOnce();
    expect(harness.context.resume).toHaveBeenCalledOnce();
    expect(harness.context.close).toHaveBeenCalledOnce();
    expect(harness.constructor).toHaveBeenCalledOnce();
  });

  it('drops expired batched events and silences the cabinet in attract mode after a win', async () => {
    // arrange
    const harness = createHarness();
    const audio = new PongAudio();
    await audio.resume();
    const event = {
      id: 1,
      kind: 'paddle' as const,
      frame: 0,
      line: 0,
      ballCounter: 252,
      verticalLoad: 7,
    };
    // act
    audio.update(snapshot({ frame: 10, soundEvents: [event] }));
    audio.update(
      snapshot({ frame: 11, soundEvents: [{ ...event, id: 2, frame: 11, kind: 'score' }] }),
    );
    audio.update(
      snapshot({
        status: 'gameOver',
        frame: 12,
        soundEvents: [{ ...event, id: 3, frame: 12, kind: 'score' }],
      }),
    );
    // assert
    expect(harness.sources).toHaveLength(1);
    expect(harness.sources[0]!.stop).toHaveBeenCalledOnce();
    audio.dispose();
  });
});
