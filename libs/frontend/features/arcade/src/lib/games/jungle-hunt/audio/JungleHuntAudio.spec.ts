// #region Imports

import { afterEach, describe, expect, it, vi } from 'vitest';
import { JungleHuntGame } from '../model/JungleHuntGame';
import { JungleHuntAudio } from './JungleHuntAudio';

// #endregion

function audioContext() {
  const gain = {
    gain: { value: 1, setValueAtTime: vi.fn() },
    connect: vi.fn(),
    disconnect: vi.fn(),
  };
  const voices: {
    start: ReturnType<typeof vi.fn>;
    stop: ReturnType<typeof vi.fn>;
    disconnect: ReturnType<typeof vi.fn>;
    connect: ReturnType<typeof vi.fn>;
    onended?: () => void;
  }[] = [];
  const context = {
    state: 'running',
    currentTime: 0,
    sampleRate: 44100,
    destination: {},
    resume: vi.fn(async () => undefined),
    suspend: vi.fn(async () => undefined),
    close: vi.fn(async () => undefined),
    createGain: () => gain,
    createBuffer: (_channels: number, length: number) => ({
      getChannelData: () => new Float32Array(length),
    }),
    createBufferSource: () => {
      const source = { start: vi.fn(), stop: vi.fn(), disconnect: vi.fn(), connect: vi.fn() };
      voices.push(source);
      return source;
    },
  };
  vi.stubGlobal(
    'AudioContext',
    class {
      constructor() {
        return context;
      }
    },
  );
  return { context, gain, voices };
}

afterEach(() => vi.unstubAllGlobals());

describe('JungleHuntAudio', () => {
  it('plays an event once and silences active nodes on mute, pause and disposal', async () => {
    // arrange
    const stub = audioContext();
    const audio = new JungleHuntAudio();
    const game = new JungleHuntGame();
    game.startNewGame();
    // act
    await audio.resume();
    audio.update(game.snapshot);
    audio.update(game.snapshot);
    audio.setMuted(true);
    audio.suspend();
    audio.dispose();
    // assert
    expect(stub.voices).toHaveLength(1);
    expect(stub.voices[0]!.start).toHaveBeenCalledOnce();
    expect(stub.voices[0]!.stop).toHaveBeenCalledOnce();
    expect(stub.gain.gain.setValueAtTime).toHaveBeenLastCalledWith(0, 0);
    expect(stub.context.suspend).toHaveBeenCalledOnce();
    expect(stub.context.close).toHaveBeenCalledOnce();
  });

  it('does not replay muted events and never recreates a disposed context', async () => {
    // arrange
    const stub = audioContext();
    const audio = new JungleHuntAudio();
    const game = new JungleHuntGame();
    game.startNewGame();
    await audio.resume();
    // act
    audio.setMuted(true);
    audio.update(game.snapshot);
    audio.setMuted(false);
    audio.update(game.snapshot);
    audio.dispose();
    await audio.resume();
    // assert
    expect(stub.voices).toHaveLength(0);
    expect(stub.context.resume).toHaveBeenCalledOnce();
  });

  it('resets old voices without blocking a new run and tolerates denied browser audio', async () => {
    // arrange
    const stub = audioContext();
    const audio = new JungleHuntAudio();
    const game = new JungleHuntGame();
    game.startNewGame();
    await audio.resume();
    audio.update(game.snapshot);
    // act
    audio.reset();
    game.startNewGame();
    audio.update(game.snapshot);
    stub.context.resume.mockRejectedValueOnce(new Error('gesture required'));
    await audio.resume();
    // assert
    expect(stub.voices).toHaveLength(2);
    expect(stub.voices[0]!.stop).toHaveBeenCalledOnce();
    expect(stub.voices[1]!.start).toHaveBeenCalledOnce();
  });
});
