// #region Imports

import type {
  SpeechError,
  SpeechErrorCode,
  SpeechSession,
  SpeechSessionState,
} from 'electron-native-speech';
import {
  speechRecognitionEventSchema,
  type SpeechRecognitionEvent,
} from '@symphony/ipc-contracts-desktop';
import type { ISpeechRecognitionCoordinatorOptions } from './ISpeechRecognitionCoordinatorOptions';

// #endregion

export class SpeechRecognitionCoordinator {
  // #region Fields

  private readonly _createSession: () => Promise<SpeechSession>;
  private readonly _disposeBackend: () => void;
  private readonly _publish: (event: SpeechRecognitionEvent) => void;
  private _session?: SpeechSession;

  // #endregion

  // #region Ctor

  public constructor(options: ISpeechRecognitionCoordinatorOptions) {
    this._createSession = options.createSession;
    this._disposeBackend = options.disposeBackend;
    this._publish = options.publish;
  }

  // #endregion

  // #region Methods

  /**
   * Starts one native speech-recognition session for the supplied locale.
   *
   * @public
   */
  public async start(locale: string): Promise<void> {
    await this.stop();
    const session = await this._createSession();
    this._session = session;
    session.on('result', (result) => {
      if (this._session !== session || !result.text.trim()) return;
      this.publish({ kind: 'result', transcript: result.text, isFinal: result.isFinal });
    });
    session.on('state', (state) => this.handleState(session, state));
    session.on('error', (error) => this.handleError(session, error));
    try {
      await session.start({ locale, interimResults: true, continuous: false });
    } catch (cause) {
      if (this._session === session) {
        this.handleError(session, speechErrorFrom(cause));
      }
      throw new Error(speechErrorMessage(speechErrorFrom(cause).code), { cause });
    }
  }

  /**
   * Stops and releases the active speech-recognition session.
   *
   * @public
   */
  public async stop(): Promise<void> {
    const session = this._session;
    if (!session) return;
    try {
      await session.stop();
    } finally {
      if (this._session === session) {
        this._session = undefined;
        await session.dispose();
      }
    }
  }

  /**
   * Cancels and releases the active speech-recognition session without committing more audio.
   *
   * @public
   */
  public async cancel(): Promise<void> {
    const session = this._session;
    if (!session) return;
    this._session = undefined;
    try {
      await session.abort();
    } finally {
      await session.dispose();
    }
  }

  /**
   * Releases the native helper before the desktop window or app exits.
   *
   * @public
   */
  public async dispose(): Promise<void> {
    await this.cancel();
    this._disposeBackend();
  }

  private handleState(session: SpeechSession, state: SpeechSessionState): void {
    if (this._session !== session) return;
    this.publish({ kind: 'state', state });
    if (state === 'stopped') this.releaseFinishedSession(session);
  }

  private handleError(session: SpeechSession, error: SpeechError): void {
    if (this._session !== session) return;
    this.publish({
      kind: 'error',
      code: error.code,
      message: speechErrorMessage(error.code),
    });
    this.releaseFinishedSession(session);
  }

  private releaseFinishedSession(session: SpeechSession): void {
    if (this._session !== session) return;
    this._session = undefined;
    void session.dispose();
  }

  private publish(event: SpeechRecognitionEvent): void {
    this._publish(speechRecognitionEventSchema.parse(event));
  }

  // #endregion
}

function speechErrorFrom(cause: unknown): SpeechError {
  if (cause && typeof cause === 'object') {
    const candidate = cause as { readonly code?: unknown };
    if (typeof candidate.code === 'string' && isSpeechErrorCode(candidate.code)) {
      return { code: candidate.code, message: speechErrorMessage(candidate.code) };
    }
  }
  return { code: 'unknown', message: speechErrorMessage('unknown') };
}

function isSpeechErrorCode(value: string): value is SpeechErrorCode {
  return [
    'unavailable',
    'permission-denied',
    'unsupported-locale',
    'unsupported-input',
    'missing-audio-track',
    'no-speech-detected',
    'backend-failure',
    'invalid-state',
    'unknown',
  ].includes(value);
}

function speechErrorMessage(code: SpeechErrorCode): string {
  switch (code) {
    case 'permission-denied':
      return 'Microphone or speech-recognition access was denied.';
    case 'unsupported-locale':
      return 'Speech recognition is unavailable for the selected language.';
    case 'no-speech-detected':
      return 'No speech was detected.';
    case 'unavailable':
      return 'Native speech recognition is unavailable on this Mac.';
    case 'unsupported-input':
    case 'missing-audio-track':
    case 'backend-failure':
    case 'invalid-state':
    case 'unknown':
      return 'Native speech recognition could not start.';
  }
}
