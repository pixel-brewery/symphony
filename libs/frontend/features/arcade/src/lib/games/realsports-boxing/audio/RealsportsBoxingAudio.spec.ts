// #region Imports

import { afterEach, describe, expect, it, vi } from 'vitest';
import { RealsportsBoxingGame } from '../model/RealsportsBoxingGame';
import { RealsportsBoxingAudio } from './RealsportsBoxingAudio';

// #endregion

function contextStub(): {
  context: AudioContext;
  start: ReturnType<typeof vi.fn>;
  stop: ReturnType<typeof vi.fn>;
} {
  const start = vi.fn();
  const stop = vi.fn();
  const parameter = { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn(), value: 0 };
  const context = {
    state: 'running',
    currentTime: 0,
    destination: {},
    resume: vi.fn().mockResolvedValue(undefined),
    suspend: vi.fn().mockResolvedValue(undefined),
    close: vi.fn().mockResolvedValue(undefined),
    createGain: () => ({ gain: parameter, connect: vi.fn(), disconnect: vi.fn() }),
    createOscillator: () => ({
      frequency: parameter,
      connect: vi.fn(),
      disconnect: vi.fn(),
      start,
      stop,
      onended: null,
    }),
  } as unknown as AudioContext;
  vi.stubGlobal(
    'AudioContext',
    class {
      public constructor() {
        return context;
      }
    },
  );
  return { context, start, stop };
}

afterEach(() => vi.unstubAllGlobals());

describe('RealsportsBoxingAudio', () => {
  it('consumes repeated snapshots once and leaves demonstration events silent', async () => {
    // arrange
    const { start } = contextStub();
    const audio = new RealsportsBoxingAudio();
    const game = new RealsportsBoxingGame();
    await audio.resume();
    game.startMatch();
    game.step(1000 / 60);

    // act
    audio.update(game.snapshot, true);
    audio.update(game.snapshot, true);
    game.startMatch();
    game.step(1000 / 60);
    audio.update(game.snapshot, false);
    audio.update(game.snapshot, true);

    // assert
    expect(start).toHaveBeenCalledTimes(1);
  });

  it('stops old scheduled effects when a rematch resets the frame clock and releases audio on disposal', async () => {
    // arrange
    const { context, start, stop } = contextStub();
    const audio = new RealsportsBoxingAudio();
    const game = new RealsportsBoxingGame();
    await audio.resume();
    game.startMatch();
    game.step(1000 / 60);
    audio.update(game.snapshot, true);
    game.step(200);
    audio.update(game.snapshot, true);
    const scheduledStops = stop.mock.calls.length;

    // act
    game.startMatch();
    game.step(1000 / 60);
    audio.update(game.snapshot, true);
    audio.dispose();
    await audio.resume();

    // assert
    expect(start).toHaveBeenCalledTimes(2);
    expect(stop.mock.calls.length).toBeGreaterThan(scheduledStops + 1);
    expect(context.close).toHaveBeenCalledTimes(1);
  });
});
