// @vitest-environment jsdom

// #region Imports

import '@angular/compiler';
import type { DestroyRef } from '@angular/core';
import type { IDesktopApi, SpeechRecognitionEvent } from '@symphony/ipc-contracts-desktop';
import { describe, expect, it, vi } from 'vitest';
import type { NotificationService } from '@symphony/frontend-notification';
import { DesktopSpeechRecognitionService } from './DesktopSpeechRecognitionService';

// #endregion

function createHarness(): {
  readonly desktop: IDesktopApi;
  readonly emit: (event: SpeechRecognitionEvent) => void;
  readonly notifications: { showError: ReturnType<typeof vi.fn> };
  readonly request: ReturnType<typeof vi.fn>;
} {
  let listener: ((event: SpeechRecognitionEvent) => void) | undefined;
  const request = vi.fn(async () => ({}));
  const desktop = {
    capabilities: { speechRecognition: true },
    request,
    onSpeechRecognitionEvent: (next: (event: SpeechRecognitionEvent) => void) => {
      listener = next;
      return () => {
        listener = undefined;
      };
    },
  } as unknown as IDesktopApi;
  return {
    desktop,
    emit: (event) => listener?.(event),
    notifications: { showError: vi.fn() },
    request,
  };
}

function createService(harness: ReturnType<typeof createHarness>): DesktopSpeechRecognitionService {
  const destroyRef = { onDestroy: vi.fn() } as unknown as DestroyRef;
  return new DesktopSpeechRecognitionService(
    destroyRef,
    harness.notifications as unknown as NotificationService,
    harness.desktop,
  );
}

describe('DesktopSpeechRecognitionService', () => {
  it('delivers only the final native transcript and finishes with the session', async () => {
    // arrange
    const harness = createHarness();
    const service = createService(harness);
    const transcripts: string[] = [];
    const stopped = vi.fn();

    // act
    await service.start((transcript) => transcripts.push(transcript), stopped);
    harness.emit({ kind: 'result', transcript: 'work', isFinal: false });
    harness.emit({ kind: 'result', transcript: 'workspace', isFinal: true });
    harness.emit({ kind: 'state', state: 'stopped' });

    // assert
    expect(transcripts).toEqual(['workspace']);
    expect(stopped).toHaveBeenCalledOnce();
    expect(harness.request).toHaveBeenCalledWith('speech.start', { locale: navigator.language });
  });

  it('reports denied native permissions and releases the consumer', async () => {
    // arrange
    const harness = createHarness();
    const service = createService(harness);
    const stopped = vi.fn();
    await service.start(vi.fn(), stopped);

    // act
    harness.emit({
      kind: 'error',
      code: 'permission-denied',
      message: 'Microphone or speech-recognition access was denied.',
    });

    // assert
    expect(harness.notifications.showError).toHaveBeenCalledWith(
      'Voice search could not start.',
      'Allow microphone access for Symphony in macOS System Settings and try again.',
    );
    expect(stopped).toHaveBeenCalledOnce();
  });
});
