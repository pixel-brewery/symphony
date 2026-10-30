// #region Imports

import type {
  LiveSpeechResult,
  SpeechError,
  SpeechSession,
  SpeechSessionState,
} from 'electron-native-speech';
import type { SpeechRecognitionEvent } from '@symphony/ipc-contracts-desktop';
import { describe, expect, it, vi } from 'vitest';
import { SpeechRecognitionCoordinator } from './SpeechRecognitionCoordinator';

// #endregion

type SpeechListeners = {
  result?: (result: LiveSpeechResult) => void;
  error?: (error: SpeechError) => void;
  state?: (state: SpeechSessionState) => void;
};

function createSession(): {
  readonly listeners: SpeechListeners;
  readonly session: SpeechSession;
  readonly start: ReturnType<typeof vi.fn>;
  readonly stop: ReturnType<typeof vi.fn>;
  readonly abort: ReturnType<typeof vi.fn>;
  readonly dispose: ReturnType<typeof vi.fn>;
} {
  const listeners: SpeechListeners = {};
  const start = vi.fn(async () => undefined);
  const stop = vi.fn(async () => undefined);
  const abort = vi.fn(async () => undefined);
  const dispose = vi.fn(async () => undefined);
  return {
    listeners,
    start,
    stop,
    abort,
    dispose,
    session: {
      start,
      stop,
      abort,
      dispose,
      on: ((event: keyof SpeechListeners, listener: never) => {
        listeners[event] = listener;
        return () => {
          listeners[event] = undefined;
        };
      }) as SpeechSession['on'],
    },
  };
}

describe('SpeechRecognitionCoordinator', () => {
  it('publishes bounded results from the native session', async () => {
    // arrange
    const fake = createSession();
    const events: SpeechRecognitionEvent[] = [];
    const coordinator = new SpeechRecognitionCoordinator({
      createSession: async () => fake.session,
      disposeBackend: vi.fn(),
      publish: (event) => events.push(event),
    });

    // act
    await coordinator.start('de-DE');
    fake.listeners.state?.('listening');
    fake.listeners.result?.({ text: 'Symphony durchsuchen', isFinal: true });

    // assert
    expect(fake.start).toHaveBeenCalledWith({
      locale: 'de-DE',
      interimResults: true,
      continuous: false,
    });
    expect(events).toEqual([
      { kind: 'state', state: 'listening' },
      { kind: 'result', transcript: 'Symphony durchsuchen', isFinal: true },
    ]);
  });

  it('aborts the native session when recognition is cancelled', async () => {
    // arrange
    const fake = createSession();
    const coordinator = new SpeechRecognitionCoordinator({
      createSession: async () => fake.session,
      disposeBackend: vi.fn(),
      publish: vi.fn(),
    });
    await coordinator.start('de-DE');

    // act
    await coordinator.cancel();

    // assert
    expect(fake.abort).toHaveBeenCalledOnce();
    expect(fake.dispose).toHaveBeenCalledOnce();
  });

  it('publishes the final result emitted while the native session stops', async () => {
    // arrange
    const fake = createSession();
    const events: SpeechRecognitionEvent[] = [];
    const coordinator = new SpeechRecognitionCoordinator({
      createSession: async () => fake.session,
      disposeBackend: vi.fn(),
      publish: (event) => events.push(event),
    });
    fake.stop.mockImplementation(async () => {
      fake.listeners.result?.({ text: 'Letztes Ergebnis', isFinal: true });
      fake.listeners.state?.('stopped');
    });
    await coordinator.start('de-DE');

    // act
    await coordinator.stop();

    // assert
    expect(events).toContainEqual({
      kind: 'result',
      transcript: 'Letztes Ergebnis',
      isFinal: true,
    });
    expect(fake.dispose).toHaveBeenCalledOnce();
  });
});
