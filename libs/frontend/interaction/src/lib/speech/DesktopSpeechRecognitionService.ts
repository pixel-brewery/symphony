// #region Imports

import { DestroyRef, Inject, inject, Injectable } from '@angular/core';
import type { IDesktopApi, SpeechRecognitionEvent } from '@symphony/ipc-contracts-desktop';
import { DESKTOP_CLIENT } from '@symphony/frontend-core/desktop';
import { NotificationService } from '@symphony/frontend-notification';

// #endregion

type ActiveRecognition = {
  readonly token: symbol;
  readonly onTranscript: (transcript: string) => void;
  readonly onStopped: () => void;
};

@Injectable({ providedIn: 'root' })
export class DesktopSpeechRecognitionService {
  // #region Fields

  private readonly _desktop: IDesktopApi;
  private readonly _notifications: NotificationService;
  private readonly _unsubscribe: () => void;
  private _active?: ActiveRecognition;

  // #endregion

  // #region Ctor

  public constructor(
    @Inject(DestroyRef)
    destroyRef: DestroyRef = inject(DestroyRef),
    @Inject(NotificationService)
    notifications: NotificationService = inject(NotificationService),
    @Inject(DESKTOP_CLIENT)
    desktop: IDesktopApi = inject(DESKTOP_CLIENT),
  ) {
    this._desktop = desktop;
    this._notifications = notifications;
    this._unsubscribe = this._desktop.onSpeechRecognitionEvent((event) => this.handleEvent(event));
    destroyRef.onDestroy(() => {
      this._unsubscribe();
      void this.cancel();
    });
  }

  // #endregion

  // #region Properties

  /**
   * Whether the complete desktop runtime provides native speech recognition.
   *
   * @public
   * @readonly
   */
  public get available(): boolean {
    return this._desktop.capabilities.speechRecognition;
  }

  // #endregion

  // #region Methods

  /**
   * Starts a one-utterance recognition session and assigns its final transcript to one consumer.
   *
   * @public
   */
  public async start(
    onTranscript: (transcript: string) => void,
    onStopped: () => void,
  ): Promise<boolean> {
    if (!this.available) return false;
    await this.cancel();
    const active: ActiveRecognition = {
      token: Symbol('speech-recognition'),
      onTranscript,
      onStopped,
    };
    this._active = active;
    try {
      await this._desktop.request('speech.start', { locale: navigator.language });
      return this._active?.token === active.token;
    } catch {
      if (this._active?.token === active.token) {
        this.showFailure('unknown');
        this.finish(active);
      }
      return false;
    }
  }

  /**
   * Stops the active session and allows the native recognizer to commit its final result.
   *
   * @public
   */
  public async stop(): Promise<void> {
    const active = this._active;
    if (!active) return;
    try {
      await this._desktop.request('speech.stop', {});
    } finally {
      this.finish(active);
    }
  }

  /**
   * Cancels the active session without accepting more recognized text.
   *
   * @public
   */
  public async cancel(): Promise<void> {
    const active = this._active;
    if (!active) return;
    this.finish(active);
    await this._desktop.request('speech.cancel', {}).catch(() => undefined);
  }

  private handleEvent(event: SpeechRecognitionEvent): void {
    const active = this._active;
    if (!active) return;
    switch (event.kind) {
      case 'result':
        if (event.isFinal) active.onTranscript(event.transcript);
        return;
      case 'state':
        if (event.state === 'stopped') this.finish(active);
        return;
      case 'error':
        this.showFailure(event.code);
        this.finish(active);
        return;
    }
  }

  private finish(active: ActiveRecognition): void {
    if (this._active?.token !== active.token) return;
    this._active = undefined;
    active.onStopped();
  }

  private showFailure(code: Extract<SpeechRecognitionEvent, { kind: 'error' }>['code']): void {
    this._notifications.showError(
      'Voice search could not start.',
      code === 'permission-denied'
        ? 'Allow microphone access for Symphony in macOS System Settings and try again.'
        : 'Check the microphone and try again.',
    );
  }

  // #endregion
}
