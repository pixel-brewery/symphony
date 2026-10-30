// #region Imports

import { afterEach, describe, expect, it, vi } from 'vitest';
import { PitfallGame } from '../model/PitfallGame';
import { PitfallAudio } from './PitfallAudio';

// #endregion

function createHarness() {
  const parameter = () => ({
    value: 0,
    cancelScheduledValues: vi.fn(),
    setValueAtTime: vi.fn(),
    setTargetAtTime: vi.fn(),
  });
  const gains = Array.from({ length: 3 }, () => ({
    gain: parameter(),
    connect: vi.fn(),
    disconnect: vi.fn(),
  }));
  const oscillators = Array.from({ length: 2 }, () => ({
    frequency: parameter(),
    setPeriodicWave: vi.fn(),
    connect: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
  }));
  let gainIndex = 0;
  let oscillatorIndex = 0;
  const context = {
    state: 'running',
    currentTime: 10,
    destination: {},
    createGain: vi.fn(() => gains[gainIndex++]),
    createOscillator: vi.fn(() => oscillators[oscillatorIndex++]),
    createPeriodicWave: vi.fn(() => ({})),
    resume: vi.fn(async () => undefined),
    suspend: vi.fn(async () => undefined),
    close: vi.fn(async () => undefined),
  };
  const constructor = vi.fn(function () {
    return context;
  });
  vi.stubGlobal('AudioContext', constructor);
  return { constructor, context, gains, oscillators };
}

describe('PitfallAudio', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('creates no audio context until a trusted action resumes it and does not replay old events', async () => {
    // arrange
    const harness = createHarness();
    const audio = new PitfallAudio();
    const snapshot = {
      ...new PitfallGame().snapshot,
      soundEvents: [{ id: 1, kind: 'jump' as const }],
    };

    // act
    audio.update(snapshot);
    expect(harness.constructor).not.toHaveBeenCalled();
    await audio.resume();
    audio.update(snapshot);

    // assert
    expect(harness.constructor).toHaveBeenCalledOnce();
    expect(harness.oscillators[0]?.frequency.setValueAtTime).not.toHaveBeenCalled();
    audio.dispose();
  });

  it('plays each event once using original poly4 pitch and a one-frame terminal note', async () => {
    // arrange
    const harness = createHarness();
    const audio = new PitfallAudio();
    await audio.resume();
    const snapshot = {
      ...new PitfallGame().snapshot,
      soundEvents: [{ id: 1, kind: 'jump' as const }],
    };

    // act
    audio.update(snapshot);
    audio.update(snapshot);

    // assert
    const pitch = harness.oscillators[0]?.frequency.setValueAtTime;
    expect(pitch).toHaveBeenCalledTimes(5);
    expect(pitch).toHaveBeenNthCalledWith(1, 31399.5 / (15 * 7), 10);
    expect(harness.gains[1]?.gain.setValueAtTime).toHaveBeenLastCalledWith(0, 10 + 17 / 60);
    audio.dispose();
  });

  it('keeps consuming muted events and releases both audio channels once', async () => {
    // arrange
    const harness = createHarness();
    const audio = new PitfallAudio();
    await audio.resume();
    const snapshot = {
      ...new PitfallGame().snapshot,
      soundEvents: [{ id: 1, kind: 'treasure' as const }],
    };

    // act
    audio.setMuted(true);
    audio.update(snapshot);
    audio.setMuted(false);
    audio.update(snapshot);
    audio.dispose();
    audio.dispose();

    // assert
    expect(harness.gains[0]?.gain.setTargetAtTime).toHaveBeenNthCalledWith(1, 0, 10, 0.008);
    expect(harness.oscillators[0]?.frequency.setValueAtTime).toHaveBeenCalledTimes(12);
    expect(harness.oscillators[0]?.stop).toHaveBeenCalledOnce();
    expect(harness.oscillators[1]?.stop).toHaveBeenCalledOnce();
    expect(harness.context.close).toHaveBeenCalledOnce();
  });

  it('stops a previous game on reset and plays the final treasure after the game has ended', async () => {
    // arrange
    const harness = createHarness();
    const audio = new PitfallAudio();
    await audio.resume();
    const initial = new PitfallGame().snapshot;
    audio.update({ ...initial, totalFrames: 120, soundEvents: [{ id: 5, kind: 'jump' }] });

    // act
    audio.update(initial);
    const resetCancellationCount =
      harness.oscillators[0]?.frequency.cancelScheduledValues.mock.calls.length;
    audio.update({ ...initial, status: 'won', soundEvents: [{ id: 6, kind: 'treasure' }] });

    // assert
    expect(resetCancellationCount).toBe(2);
    expect(harness.oscillators[0]?.frequency.setValueAtTime).toHaveBeenCalledTimes(17);
    audio.dispose();
  });
});
