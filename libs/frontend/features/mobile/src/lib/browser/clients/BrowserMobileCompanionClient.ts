// #region Imports

import { DOCUMENT } from '@angular/common';
import { Inject, inject, Injectable } from '@angular/core';
import type { IMobileCompanionClient } from './IMobileCompanionClient';

// #endregion

type BrowserWindow = Window & {
  readonly WebSocket: typeof WebSocket;
};

/** Browser implementation of the mobile companion transport contract. */
@Injectable({ providedIn: 'root' })
export class BrowserMobileCompanionClient implements IMobileCompanionClient {
  // #region Fields

  private readonly _window: BrowserWindow;

  // #endregion

  // #region Ctor

  /**
   * Constructs the client for the active browser window.
   *
   * @public
   */
  public constructor(@Inject(DOCUMENT) document: Document = inject(DOCUMENT)) {
    const browserWindow = document.defaultView;
    if (!browserWindow) throw new Error('Mobile companion access requires a browser window.');
    this._window = browserWindow as BrowserWindow;
  }

  // #endregion

  // #region Methods

  /**
   * @inheritdoc
   *
   * @public
   */
  public async request(
    route: string,
    method: 'GET' | 'POST' = 'GET',
    body?: unknown,
  ): Promise<{ readonly ok: boolean; readonly status: number; readonly body: unknown }> {
    const response = await this._window.fetch(route, {
      method,
      credentials: 'same-origin',
      ...(body === undefined
        ? {}
        : { headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }),
    });
    return { ok: response.ok, status: response.status, body: await response.json() };
  }

  /**
   * @inheritdoc
   *
   * @public
   */
  public connectEvents(
    route: string,
    handlers: {
      readonly open: () => void;
      readonly message: (data: unknown) => void;
      readonly close: () => void;
    },
  ): () => void {
    const protocol = this._window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const socket = new this._window.WebSocket(`${protocol}//${this._window.location.host}${route}`);
    socket.addEventListener('open', handlers.open);
    socket.addEventListener('message', (event: MessageEvent<unknown>) =>
      handlers.message(event.data),
    );
    socket.addEventListener('close', handlers.close);
    return () => socket.close();
  }

  /**
   * @inheritdoc
   *
   * @public
   */
  public pairingChallenge(): string | undefined {
    const fragment = this._window.location.hash.slice(1);
    if (!fragment) return undefined;
    return new URLSearchParams(fragment).get('pair') ?? undefined;
  }

  /**
   * @inheritdoc
   *
   * @public
   */
  public clearPairingChallenge(): void {
    const location = this._window.location;
    this._window.history.replaceState(null, '', `${location.pathname}${location.search}`);
  }

  /**
   * @inheritdoc
   *
   * @public
   */
  public deviceName(): string {
    return this._window.navigator.platform
      ? `${this._window.navigator.platform} phone`
      : 'Mobile browser';
  }

  /**
   * @inheritdoc
   *
   * @public
   */
  public createOperationId(): string {
    return this._window.crypto.randomUUID();
  }

  /**
   * @inheritdoc
   *
   * @public
   */
  public schedule(callback: () => void, delayMilliseconds: number): number {
    return this._window.setTimeout(callback, delayMilliseconds);
  }

  /**
   * @inheritdoc
   *
   * @public
   */
  public cancel(scheduleId: number): void {
    this._window.clearTimeout(scheduleId);
  }

  // #endregion
}
