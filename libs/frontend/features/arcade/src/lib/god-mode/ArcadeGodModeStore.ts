// #region Imports

import { DOCUMENT } from '@angular/common';
import { DestroyRef, Inject, Injectable, signal } from '@angular/core';
import { NotificationService } from '@symphony/frontend-notification';

// #endregion

const KONAMI_CODE = [
  ['ArrowUp', '↑'],
  ['ArrowUp', '↑'],
  ['ArrowDown', '↓'],
  ['ArrowDown', '↓'],
  ['ArrowLeft', '←'],
  ['ArrowRight', '→'],
  ['ArrowLeft', '←'],
  ['ArrowRight', '→'],
  ['KeyB', 'B'],
  ['KeyA', 'A'],
] as const;

const SEQUENCE_RESET_DELAY_MS = 2_000;

/** Channel that keeps god mode in step across Symphony's windows (main and Settings). */
const CHANNEL_NAME = 'symphony.arcade-god-mode';

/** Messages exchanged on the channel. */
type GodModeMessage = { readonly kind: 'enabled' } | { readonly kind: 'query' };

/** Owns the renderer-session Arcade test mode and its activation progress. @public */
@Injectable({ providedIn: 'root' })
export class ArcadeGodModeStore {
  // #region Fields

  private readonly _document: Document;
  private readonly _notifications: NotificationService;
  private readonly _enabled = signal(false);
  private readonly _progress = signal(0);
  private _resetTimer: number | undefined;
  private _initialized = false;
  private _channel: BroadcastChannel | undefined;
  private readonly _keyDownListener = (event: KeyboardEvent): void => this.onKeyDown(event);

  /** Whether Arcade simulations should apply their session-only test rules. @public @readonly */
  public readonly enabled = this._enabled.asReadonly();
  /** Keyboard labels in activation order. @public @readonly */
  public readonly sequence = KONAMI_CODE.map(([, label]) => label);
  /** Number of accepted keys in the current activation attempt. @public @readonly */
  public readonly progress = this._progress.asReadonly();

  // #endregion

  // #region Ctor

  /** @public */
  public constructor(
    @Inject(DOCUMENT) document: Document,
    @Inject(NotificationService) notifications: NotificationService,
    @Inject(DestroyRef) destroyRef: DestroyRef,
  ) {
    this._document = document;
    this._notifications = notifications;
    destroyRef.onDestroy(() => this.dispose());
  }

  // #endregion

  // #region Methods

  /** Begins observing the main renderer window without consuming keyboard events. @public */
  public initialize(): void {
    if (this._initialized || this._document.defaultView?.location.hash.startsWith('#/menu-bar'))
      return;
    this._initialized = true;
    this._document.addEventListener('keydown', this._keyDownListener, true);
    this.connectWindows();
  }

  /** Releases the renderer-wide listener. @public */
  public dispose(): void {
    if (!this._initialized) return;
    this._initialized = false;
    this.clearResetTimer();
    if (!this._enabled()) this._progress.set(0);
    this._document.removeEventListener('keydown', this._keyDownListener, true);
    this._channel?.close();
    this._channel = undefined;
  }

  /** Advances the hidden code while leaving ordinary application input untouched. @private */
  private onKeyDown(event: KeyboardEvent): void {
    if (
      this._enabled() ||
      event.repeat ||
      event.altKey ||
      event.ctrlKey ||
      event.metaKey ||
      event.shiftKey
    )
      return;
    const progress = this._progress();
    if (event.code === KONAMI_CODE[progress]?.[0]) {
      const nextProgress = progress + 1;
      this._progress.set(nextProgress);
      if (nextProgress !== KONAMI_CODE.length) {
        this.restartResetTimer();
        return;
      }
      this.clearResetTimer();
      this._enabled.set(true);
      this._notifications.showSuccess('God mode activated');
      this.post({ kind: 'enabled' });
      return;
    }
    const nextProgress = event.code === KONAMI_CODE[0][0] ? 1 : 0;
    this._progress.set(nextProgress);
    if (nextProgress === 0) this.clearResetTimer();
    else this.restartResetTimer();
  }

  /**
   * Shares god mode with Symphony's other windows: the code can be entered in the Settings window
   * while the games run in the main window. A window that opens later asks whether god mode is
   * already active. @private
   */
  private connectWindows(): void {
    const view = this._document.defaultView as (Window & typeof globalThis) | null;
    if (!view || typeof view.BroadcastChannel === 'undefined') return;
    const channel = new view.BroadcastChannel(CHANNEL_NAME);
    this._channel = channel;
    channel.onmessage = (event: MessageEvent<GodModeMessage>) => {
      if (event.data?.kind === 'query' && this._enabled()) this.post({ kind: 'enabled' });
      if (event.data?.kind === 'enabled' && !this._enabled()) {
        this.clearResetTimer();
        this._progress.set(KONAMI_CODE.length);
        this._enabled.set(true);
      }
    };
    this.post({ kind: 'query' });
  }

  /** Posts a message to the other windows. @private */
  private post(message: GodModeMessage): void {
    this._channel?.postMessage(message);
  }

  /** Restarts the inactivity window for the current attempt. @private */
  private restartResetTimer(): void {
    const view = this._document.defaultView;
    if (!view) return;
    this.clearResetTimer();
    this._resetTimer = view.setTimeout(() => {
      this._resetTimer = undefined;
      if (!this._enabled()) this._progress.set(0);
    }, SEQUENCE_RESET_DELAY_MS);
  }

  /** Clears a pending inactivity reset. @private */
  private clearResetTimer(): void {
    if (this._resetTimer === undefined) return;
    this._document.defaultView?.clearTimeout(this._resetTimer);
    this._resetTimer = undefined;
  }

  // #endregion
}
