// #region Imports

import { afterEach, describe, expect, it, vi } from 'vitest';
import { SeaquestAudio } from './SeaquestAudio';

// #endregion

function createHarness() {
  const gain = {
    gain: { value: 0, setTargetAtTime: vi.fn() },
    connect: vi.fn(),
    disconnect: vi.fn(),
  };
  const source = () => ({
    buffer: null,
    onended: null,
    connect: vi.fn(),
    disconnect: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
  });
  const context = {
    state: 'running',
    currentTime: 10,
    sampleRate: 48000,
    destination: {},
    createGain: vi.fn(() => gain),
    createBuffer: vi.fn((_channels: number, length: number) => ({
      getChannelData: () => new Float32Array(length),
    })),
    createBufferSource: vi.fn(source),
    resume: vi.fn(async () => undefined),
    suspend: vi.fn(async () => undefined),
    close: vi.fn(async () => undefined),
  };
  const constructor = vi.fn(function () {
    return context;
  });
  vi.stubGlobal('AudioContext', constructor);
  return { gain, context, constructor };
}

describe('SeaquestAudio', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('waits for a gesture and never replays events observed before audio unlock', async () => {
    // arrange
    const harness = createHarness();
    const audio = new SeaquestAudio();

    // act
    audio.consume([{ id: 1, kind: 'shoot' }]);
    const initialConstructions = harness.constructor.mock.calls.length;
    await audio.resume();
    audio.consume([{ id: 1, kind: 'shoot' }]);

    // assert
    expect(initialConstructions).toBe(0);
    expect(harness.context.createBufferSource).not.toHaveBeenCalled();
    audio.dispose();
  });

  it('replaces each cartridge channel independently and stops the torpedo on its end event', async () => {
    // arrange
    const harness = createHarness();
    const audio = new SeaquestAudio();
    await audio.resume();
    audio.consume([
      { id: 1, kind: 'shoot' },
      { id: 2, kind: 'diver' },
    ]);
    const [shot, diver] = harness.context.createBufferSource.mock.results.map(
      (result) => result.value,
    );

    // act
    audio.consume([{ id: 3, kind: 'shot-end' }]);

    // assert
    expect(shot.stop).toHaveBeenCalledOnce();
    expect(diver.stop).not.toHaveBeenCalled();
    expect(harness.context.createBufferSource).toHaveBeenCalledTimes(2);
    audio.dispose();
  });

  it('advances muted cues once, freezes audio and releases both channels on teardown', async () => {
    // arrange
    const harness = createHarness();
    const audio = new SeaquestAudio();
    await audio.resume();
    audio.setMuted(true);
    audio.consume([{ id: 1, kind: 'surface' }]);

    // act
    audio.setMuted(false);
    audio.consume([{ id: 1, kind: 'surface' }]);
    audio.suspend();
    audio.dispose();
    audio.dispose();

    // assert
    expect(harness.context.createBufferSource).toHaveBeenCalledTimes(2);
    for (const result of harness.context.createBufferSource.mock.results)
      expect(result.value.stop).toHaveBeenCalledOnce();
    expect(harness.context.suspend).toHaveBeenCalledOnce();
    expect(harness.context.close).toHaveBeenCalledOnce();
    expect(harness.gain.disconnect).toHaveBeenCalledOnce();
  });

  it('silences resets without replaying a lifetime-unique event', async () => {
    // arrange
    const harness = createHarness();
    const audio = new SeaquestAudio();
    await audio.resume();
    audio.consume([{ id: 9, kind: 'death' }]);

    // act
    audio.reset();
    audio.consume([
      { id: 9, kind: 'death' },
      { id: 10, kind: 'shoot' },
    ]);

    // assert
    expect(harness.context.createBufferSource).toHaveBeenCalledTimes(2);
    expect(harness.context.createBufferSource.mock.results[0]!.value.stop).toHaveBeenCalledOnce();
    audio.dispose();
  });
});
