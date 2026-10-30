// #region Imports

import { afterEach, describe, expect, it, vi } from 'vitest';
import type { IPitfallIISnapshot } from '../model/IPitfallIISnapshot';
import { PitfallIIGame } from '../model/PitfallIIGame';
import { PitfallIIAudio } from './PitfallIIAudio';

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

function snapshot(overrides: Partial<IPitfallIISnapshot> = {}): IPitfallIISnapshot {
  return { ...new PitfallIIGame().snapshot, status: 'playing', ...overrides };
}

describe('PitfallIIAudio', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('unlocks only on a gesture and consumes earlier effects without replaying them', async () => {
    // arrange
    const harness = createHarness();
    const audio = new PitfallIIAudio();
    const state = snapshot({ soundEvents: [{ id: 1, kind: 'jump' }] });

    // act
    audio.update(state);
    expect(harness.constructor).not.toHaveBeenCalled();
    await audio.resume();
    audio.update(state);

    // assert
    expect(harness.constructor).toHaveBeenCalledOnce();
    expect(harness.effects()).toHaveLength(0);
    expect(harness.music()).toHaveLength(1);
    audio.dispose();
  });

  it('replaces only percussion during effects, suppresses competing jumps and consumes each event once', async () => {
    // arrange
    const harness = createHarness();
    const audio = new PitfallIIAudio();
    await audio.resume();
    audio.update(snapshot());
    const drums = harness.gains[1]!;
    const treasure = snapshot({ soundEvents: [{ id: 1, kind: 'treasure' }] });

    // act
    audio.update(treasure);
    audio.update(treasure);
    audio.update(snapshot({ soundEvents: [{ id: 2, kind: 'jump' }] }));

    // assert
    expect(harness.effects()).toHaveLength(1);
    expect(harness.music()).toHaveLength(1);
    expect(harness.music()[0]!.stop).not.toHaveBeenCalled();
    expect(harness.splitters[0]!.connect).toHaveBeenNthCalledWith(1, harness.gains[0], 0);
    expect(harness.splitters[0]!.connect).toHaveBeenNthCalledWith(2, drums, 1);
    expect(drums.gain.setValueAtTime).toHaveBeenLastCalledWith(1, 10 + 31 / 60);
    expect(drums.gain.setValueAtTime).toHaveBeenCalledWith(0, 10);
    audio.dispose();
  });

  it('replaces active effects without letting an old completion disconnect the newer source', async () => {
    // arrange
    const harness = createHarness();
    const audio = new PitfallIIAudio();
    await audio.resume();
    audio.update(snapshot({ soundEvents: [{ id: 1, kind: 'jump' }] }));
    const previous = harness.effects()[0]!;
    const oldCompletion = previous.onended;

    // act
    harness.context.currentTime += 1 / 60;
    audio.update(snapshot({ soundEvents: [{ id: 2, kind: 'checkpoint' }] }));
    oldCompletion?.();
    audio.dispose();

    // assert
    expect(previous.stop).toHaveBeenCalledOnce();
    expect(harness.effects()[1]!.stop).toHaveBeenCalledOnce();
    expect(harness.gains[1]!.gain.cancelScheduledValues).toHaveBeenCalledWith(10 + 1 / 60);
  });

  it('seeks effects emitted during a batched step and does not replay already expired sounds', async () => {
    // arrange
    const harness = createHarness();
    const audio = new PitfallIIAudio();
    await audio.resume();

    // act
    audio.update(
      snapshot({
        totalFrames: 40,
        soundEvents: [
          { id: 1, kind: 'treasure', frame: 20 },
          { id: 2, kind: 'jump', frame: 23 },
        ],
      }),
    );
    audio.update(snapshot({ totalFrames: 40, soundEvents: [{ id: 3, kind: 'pop', frame: 25 }] }));

    // assert: the jump was blocked when it occurred; the later pop replaced the treasure and has ended.
    expect(harness.effects()).toHaveLength(1);
    expect(harness.effects()[0]!.start).toHaveBeenCalledWith(0, 20 / 60);
    expect(harness.effects()[0]!.stop).toHaveBeenCalledOnce();
    expect(harness.gains[1]!.gain.setValueAtTime).toHaveBeenLastCalledWith(1, 10);
    audio.dispose();
  });

  it('loops the background without restarting the opening until a treasure requests it', async () => {
    // arrange
    const harness = createHarness();
    const audio = new PitfallIIAudio();
    await audio.resume();
    audio.update(snapshot());
    const opening = harness.music()[0]!;

    // act
    harness.context.currentTime += 1152 / 60 + 20;
    audio.update(snapshot({ totalFrames: 2352 }));
    expect(harness.music()).toHaveLength(1);
    audio.update(
      snapshot({ totalFrames: 2353, music: 'reward', soundEvents: [{ id: 1, kind: 'treasure' }] }),
    );
    audio.update(
      snapshot({ totalFrames: 2354, music: 'reward', soundEvents: [{ id: 2, kind: 'treasure' }] }),
    );

    // assert
    expect(opening.loop).toBe(true);
    expect(opening.loopStart).toBe(1152 / 60);
    expect(opening.loopEnd).toBe((1152 + 896) / 60);
    expect(opening.stop).toHaveBeenCalledOnce();
    expect(harness.music()).toHaveLength(2);
    expect(harness.music()[1]!.stop).not.toHaveBeenCalled();
    audio.dispose();
  });

  it('switches to balloon music and returns to background rather than the opening when popped', async () => {
    // arrange
    const harness = createHarness();
    const audio = new PitfallIIAudio();
    await audio.resume();
    audio.update(snapshot());

    // act
    audio.update(snapshot({ music: 'balloon', soundEvents: [{ id: 1, kind: 'balloon' }] }));
    audio.update(snapshot({ music: 'adventure', soundEvents: [{ id: 2, kind: 'pop' }] }));

    // assert
    expect(harness.music()[1]!.loopStart).toBe(0);
    expect(harness.music()[1]!.buffer!.duration).toBe(1344 / 60);
    expect(harness.music()[2]!.loopStart).toBe(0);
    expect(harness.music()[2]!.buffer!.duration).toBe(896 / 60);
    expect(harness.effects()[0]!.buffer!.duration).toBe(15 / 60);
    audio.dispose();
  });

  it('silences the 128 injury frames then plays minor music through the checkpoint return', async () => {
    // arrange
    const harness = createHarness();
    const audio = new PitfallIIAudio();
    await audio.resume();
    audio.update(snapshot());

    // act
    audio.update(
      snapshot({
        totalFrames: 24,
        music: 'return',
        status: 'returning',
        soundEvents: [{ id: 1, kind: 'hurt', frame: 10 }],
      }),
    );
    audio.update(snapshot({ totalFrames: 137, music: 'return', status: 'returning' }));
    expect(harness.music()).toHaveLength(1);
    audio.update(snapshot({ totalFrames: 138, music: 'return', status: 'returning' }));
    audio.update(snapshot({ totalFrames: 150, music: 'adventure' }));

    // assert
    expect(harness.music()[0]!.stop).toHaveBeenCalledOnce();
    expect(harness.music()).toHaveLength(2);
    expect(harness.music()[1]!.loopStart).toBe(896 / 60);
    expect(harness.music()[1]!.stop).not.toHaveBeenCalled();
    expect(harness.effects()).toHaveLength(0);
    audio.dispose();
  });

  it('keeps pickup and pop events authoritative while a previous reward label expires', async () => {
    // arrange
    const harness = createHarness();
    const audio = new PitfallIIAudio();
    await audio.resume();
    audio.update(snapshot({ music: 'reward', soundEvents: [{ id: 1, kind: 'treasure' }] }));

    // act
    audio.update(snapshot({ music: 'reward', soundEvents: [{ id: 2, kind: 'balloon' }] }));
    audio.update(snapshot({ music: 'balloon' }));
    expect(harness.music()).toHaveLength(2);
    audio.update(snapshot({ music: 'reward', soundEvents: [{ id: 3, kind: 'pop' }] }));
    audio.update(snapshot({ music: 'adventure' }));

    // assert
    expect(harness.music()).toHaveLength(3);
    expect(harness.music()[1]!.buffer!.duration).toBe(1344 / 60);
    expect(harness.music()[2]!.buffer!.duration).toBe(896 / 60);
    audio.dispose();
  });

  it('applies successive mode changes in event order within one simulation batch', async () => {
    // arrange
    const harness = createHarness();
    const audio = new PitfallIIAudio();
    await audio.resume();
    audio.update(snapshot());

    // act
    audio.update(
      snapshot({
        music: 'balloon',
        soundEvents: [
          { id: 1, kind: 'balloon' },
          { id: 2, kind: 'treasure' },
        ],
      }),
    );
    audio.update(snapshot({ music: 'balloon' }));

    // assert: treasure resets the main arrangement even if the balloon was acquired in the same batch.
    expect(harness.music()).toHaveLength(2);
    expect(harness.music()[1]!.loopStart).toBe(1152 / 60);
    audio.dispose();
  });

  it('lets a later injury cancel a treasure restart within the same simulation batch', async () => {
    // arrange
    const harness = createHarness();
    const audio = new PitfallIIAudio();
    await audio.resume();
    audio.update(snapshot({ music: 'balloon', soundEvents: [{ id: 1, kind: 'balloon' }] }));

    // act
    audio.update(
      snapshot({
        totalFrames: 10,
        music: 'return',
        status: 'returning',
        soundEvents: [
          { id: 2, kind: 'treasure', frame: 9 },
          { id: 3, kind: 'hurt', frame: 10 },
        ],
      }),
    );
    audio.update(snapshot({ totalFrames: 138, music: 'return', status: 'returning' }));

    // assert
    expect(harness.music()).toHaveLength(2);
    expect(harness.music()[1]!.loopStart).toBe(896 / 60);
    expect(harness.effects()[0]!.stop).toHaveBeenCalledOnce();
    audio.dispose();
  });

  it('preserves playheads across suspend/resume and mute, then disposes sources and context once', async () => {
    // arrange
    const harness = createHarness();
    const audio = new PitfallIIAudio();
    audio.setMuted(true);
    await audio.resume();
    audio.update(snapshot({ soundEvents: [{ id: 1, kind: 'jump' }] }));

    // act
    audio.suspend();
    audio.update(snapshot({ status: 'paused' }));
    await audio.resume();
    audio.setMuted(false);
    audio.update(snapshot({ soundEvents: [{ id: 1, kind: 'jump' }] }));
    audio.dispose();
    audio.dispose();
    await audio.resume();

    // assert
    expect(harness.gains[0]!.gain.value).toBe(0);
    expect(harness.gains[0]!.gain.setTargetAtTime).toHaveBeenCalledWith(0.35, 10, 0.008);
    expect(harness.music()).toHaveLength(1);
    expect(harness.effects()).toHaveLength(1);
    for (const source of harness.sources) expect(source.stop).toHaveBeenCalledOnce();
    expect(harness.context.suspend).toHaveBeenCalledOnce();
    expect(harness.context.resume).toHaveBeenCalledOnce();
    expect(harness.context.close).toHaveBeenCalledOnce();
    expect(harness.constructor).toHaveBeenCalledOnce();
  });

  it('resets a played game and also restarts a ready screen whose simulation frame remains zero', async () => {
    // arrange
    const harness = createHarness();
    const audio = new PitfallIIAudio();
    await audio.resume();
    audio.update(snapshot({ totalFrames: 400 }));

    // act
    audio.update(snapshot({ status: 'ready' }));
    audio.reset();
    audio.update(snapshot({ status: 'ready' }));

    // assert
    expect(harness.music()).toHaveLength(3);
    expect(harness.music()[0]!.stop).toHaveBeenCalledOnce();
    expect(harness.music()[1]!.stop).toHaveBeenCalledOnce();
    for (const source of harness.music()) expect(source.loopStart).toBe(1152 / 60);
    audio.dispose();
  });
});
