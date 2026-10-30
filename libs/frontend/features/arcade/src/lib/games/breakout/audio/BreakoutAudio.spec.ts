// #region Imports

import { afterEach, describe, expect, it, vi } from 'vitest';
import { BreakoutGame } from '../model/BreakoutGame';
import { BreakoutAudio } from './BreakoutAudio';

// #endregion

function createHarness() {
  const parameter = () => ({
    value: 0,
    cancelScheduledValues: vi.fn(),
    setValueAtTime: vi.fn(),
    linearRampToValueAtTime: vi.fn(),
  });
  const gain = { gain: parameter(), connect: vi.fn(), disconnect: vi.fn() };
  const oscillator = {
    frequency: parameter(),
    type: 'sine',
    connect: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
  };
  const context = {
    state: 'running',
    currentTime: 10,
    destination: {},
    createGain: vi.fn(() => gain),
    createOscillator: vi.fn(() => oscillator),
    resume: vi.fn(async () => undefined),
    suspend: vi.fn(async () => undefined),
    close: vi.fn(async () => undefined),
  };
  const constructor = vi.fn(function () {
    return context;
  });
  vi.stubGlobal('AudioContext', constructor);
  return { constructor, context, gain, oscillator };
}

describe('BreakoutAudio', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('waits for a trusted gesture and consumes earlier cues without replaying them', async () => {
    // arrange
    const harness = createHarness();
    const audio = new BreakoutAudio();
    const snapshot = {
      ...new BreakoutGame().snapshot,
      soundEvents: [{ id: 1, kind: 'serve' as const }],
    };

    // act
    audio.update(snapshot);
    const constructorsBeforeGesture = harness.constructor.mock.calls.length;
    await audio.resume();
    audio.update(snapshot);

    // assert
    expect(constructorsBeforeGesture).toBe(0);
    expect(harness.constructor).toHaveBeenCalledOnce();
    expect(harness.oscillator.frequency.setValueAtTime).not.toHaveBeenCalled();
    audio.dispose();
  });

  it('plays each ordered collision once and schedules silence after it', async () => {
    // arrange
    const harness = createHarness();
    const audio = new BreakoutAudio();
    await audio.resume();
    const snapshot = {
      ...new BreakoutGame().snapshot,
      soundEvents: [{ id: 1, kind: 'brickHigh' as const }],
    };

    // act
    audio.update(snapshot);
    audio.update(snapshot);

    // assert
    expect(harness.oscillator.type).toBe('square');
    expect(harness.oscillator.frequency.setValueAtTime).toHaveBeenCalledExactlyOnceWith(880, 10);
    expect(harness.gain.gain.setValueAtTime).toHaveBeenLastCalledWith(0, 10.045);
    audio.dispose();
  });

  it('silences resets and accepts the next game monotonically increasing event IDs', async () => {
    // arrange
    const harness = createHarness();
    const audio = new BreakoutAudio();
    await audio.resume();
    const initial = new BreakoutGame().snapshot;
    audio.update({ ...initial, frame: 120, soundEvents: [{ id: 8, kind: 'miss' }] });

    // act
    audio.update(initial);
    const cancellationsAfterReset = harness.gain.gain.cancelScheduledValues.mock.calls.length;
    audio.update({ ...initial, soundEvents: [{ id: 9, kind: 'serve' }] });

    // assert
    expect(cancellationsAfterReset).toBe(2);
    expect(harness.oscillator.frequency.setValueAtTime).toHaveBeenCalledTimes(2);
    expect(harness.oscillator.frequency.setValueAtTime).toHaveBeenLastCalledWith(220, 10);
    audio.dispose();
  });

  it('consumes muted events, suspends and releases browser resources once', async () => {
    // arrange
    const harness = createHarness();
    const audio = new BreakoutAudio();
    await audio.resume();
    const snapshot = {
      ...new BreakoutGame().snapshot,
      soundEvents: [{ id: 1, kind: 'complete' as const }],
    };

    // act
    audio.setMuted(true);
    audio.update(snapshot);
    audio.setMuted(false);
    audio.update(snapshot);
    audio.suspend();
    audio.dispose();
    audio.dispose();

    // assert
    expect(harness.oscillator.frequency.setValueAtTime).not.toHaveBeenCalled();
    expect(harness.context.suspend).toHaveBeenCalledOnce();
    expect(harness.oscillator.stop).toHaveBeenCalledOnce();
    expect(harness.gain.disconnect).toHaveBeenCalledOnce();
    expect(harness.context.close).toHaveBeenCalledOnce();
  });
});
