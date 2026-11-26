// #region Imports
import { DOCUMENT } from '@angular/common';
import { Inject, inject, Injectable } from '@angular/core';
import { RemoteClientError, type RemoteSessionState } from '@pixel-brewery/remote-client';
import {
  BrowserRemoteApp,
  BrowserRemoteEvents,
  createBrowserClock,
  createBrowserOperationId,
  type BrowserRemoteAppPhase,
} from '@pixel-brewery/remote-browser';
import { remoteErrorResponseSchema } from '@pixel-brewery/remote-protocol';
import { translateLabel } from '@symphony/frontend-intl/labels';
import type { IMobileCompanionClient } from './interfaces/IMobileCompanionClient';
import type { IMobileBrowserWindow } from './interfaces/IMobileBrowserWindow';
import type { MobileCompanionConnectionState } from './MobileCompanionConnectionState';
import type { IMobileHttpResponse } from './interfaces/IMobileHttpResponse';
import type { IMobileEventHandlers } from './interfaces/IMobileEventHandlers';
// #endregion

/**
 * Composes SDK pairing, cookie authentication and bounded events for Symphony's browser product port.
 *
 * @remarks Own one instance per browser document and await dispose when its Angular owner exits. The SDK's
 * `BrowserRemoteApp` pairs from the invitation fragment, restores the session, recovers an interrupted pairing
 * attempt and prepares again when another invitation opens in the same tab; this adapter projects only product state.
 * @public
 */
@Injectable({ providedIn: 'root' })
export class BrowserMobileCompanionClient implements IMobileCompanionClient {
  // #region Fields
  private readonly _window: IMobileBrowserWindow;
  private readonly _listeners = new Set<(state: MobileCompanionConnectionState) => void>();
  private readonly _events = new Set<BrowserRemoteEvents>();
  private readonly _app: BrowserRemoteApp<undefined>;
  private readonly _detach: () => void;
  private _releaseSession: (() => void) | undefined;
  private _state: MobileCompanionConnectionState = 'offline';
  private _disposed = false;
  // #endregion
  // #region Ctor
  /**
   * Binds the active browser document and its invitation lifecycle without starting a connection.
   *
   * @param document - Browser document supplying same-origin networking and timing APIs.
   * @throws An error when the document has no owning browser window.
   * @public
   */
  public constructor(@Inject(DOCUMENT) document: Document = inject(DOCUMENT)) {
    if (!document.defaultView)
      throw new Error('Mobile companion access requires a browser window.');
    this._window = document.defaultView as IMobileBrowserWindow;
    this._app = new BrowserRemoteApp<undefined>({
      appId: 'symphony',
      window: this._window,
      // The companion page is always served by the desktop's gateway; Symphony has no capability read.
      localOrigins: [],
      readCapabilities: () => Promise.resolve(undefined),
      attemptStorageKey: 'symphony.remote.pending-attempt',
    });
    this._app.subscribe((phase) => this.project(phase));
    this._detach = this._app.attach();
  }
  // #endregion
  // #region Methods
  /**
   * Restores or completes a verified Symphony QR invitation, retaining only a public attempt identifier across tab reloads.
   *
   * @remarks Simultaneous calls share one SDK preparation; a ready session is reused without another one.
   * @returns True when the SDK session is ready; false when the browser needs another invitation.
   * @throws An error for a disposed client, a pairing that did not complete or an unreachable or mismatched host.
   * @public
   */
  public async initialize(): Promise<boolean> {
    if (this._disposed) throw new Error('The mobile connection is closed.');
    const phase = this._app.phase.kind === 'ready' ? this._app.phase : await this._app.prepare();
    if (phase.kind === 'ready') return true;
    if (phase.kind === 'error' && phase.reason === 'invitation')
      throw new Error(pairingIncompleteMessage());
    // The page is always served by the desktop, so a start without a reachable host (`normal`) is an outage too.
    if (phase.kind === 'error' || phase.kind === 'normal')
      throw new Error(
        translateLabel('loc.symphony.labels.mobile.access.is.temporarily.unavailable.f5a4ef2'),
      );
    return false;
  }

  /**
   * Sends one admitted product request, preserving SDK unknown-outcome failures for writes.
   *
   * @param route - Registered same-origin product path.
   * @param method - Exact HTTP method, default GET.
   * @param body - Product JSON payload when present.
   * @returns The product HTTP status and decoded body; feature schemas validate successful data.
   * @throws RemoteClientError for transport failure or an unknown dispatched mutation outcome.
   * @throws An error when product JSON is malformed or exceeds its bounded read budget.
   * @public
   */
  public async request(
    route: string,
    method: 'GET' | 'POST' = 'GET',
    body?: unknown,
  ): Promise<IMobileHttpResponse> {
    const session = (await this.initialize()) ? this._app.session : undefined;
    if (!session) return this.unauthorized();
    // The app stays ready while its session reconnects; an explicit request restores it first instead of waiting
    // for the retry schedule. Only a confirmed loss of the grant answers as unpaired.
    if (session.state.kind !== 'ready') await session.initialize().catch(() => undefined);
    if (isUnpaired(session.state.kind)) return this.unauthorized();
    if (session.state.kind !== 'ready')
      throw new Error(
        translateLabel('loc.symphony.labels.mobile.access.is.temporarily.unavailable.f5a4ef2'),
      );
    const encoded = body === undefined ? undefined : new TextEncoder().encode(JSON.stringify(body));
    try {
      const response = await session.request({
        method,
        path: route,
        ...(encoded
          ? {
              headers: { 'content-type': 'application/json' },
              body: (async function* () {
                yield encoded;
              })(),
            }
          : {}),
      });
      const chunks: Uint8Array[] = [];
      let size = 0;
      try {
        for await (const chunk of response.body) {
          size += chunk.byteLength;
          if (size > 32 * 1024 * 1024)
            throw new Error('The mobile response exceeds its read budget.');
          chunks.push(chunk);
        }
        const bytes = new Uint8Array(size);
        let offset = 0;
        for (const chunk of chunks) {
          bytes.set(chunk, offset);
          offset += chunk.byteLength;
        }
        const value: unknown = JSON.parse(new TextDecoder().decode(bytes));
        const sdkError = remoteErrorResponseSchema.safeParse(value);
        return {
          ok: response.status >= 200 && response.status < 300,
          status: response.status,
          body: sdkError.success
            ? { code: sdkError.data.error.code, message: sdkError.data.error.message }
            : value,
        };
      } finally {
        await response.cancel();
      }
    } catch (cause) {
      if (
        cause instanceof RemoteClientError &&
        cause.code === 'SESSION_REQUIRED' &&
        isUnpaired(session.state.kind)
      )
        return this.unauthorized();
      throw cause;
    }
  }

  /**
   * Registers a product observer of SDK lifecycle state.
   *
   * @param listener - Receives the current credential-free connection state immediately.
   * @returns Idempotent subscription cleanup.
   * @public
   */
  public subscribeConnection(
    listener: (state: MobileCompanionConnectionState) => void,
  ): () => void {
    this._listeners.add(listener);
    listener(this._state);
    return () => {
      this._listeners.delete(listener);
    };
  }

  /**
   * Composes bounded same-origin events without keeping a second reconnect implementation.
   *
   * @param route - Registered product WebSocket route.
   * @param handlers - Product reconciliation, message and close observers.
   * @returns Cleanup closing this stream and all of its scheduled retries.
   * @throws An error when the same-origin route or WebSocket factory cannot create the channel.
   * @public
   */
  public connectEvents(route: string, handlers: IMobileEventHandlers): () => void {
    let closed = false;
    const events = new BrowserRemoteEvents({
      origin: this._window.location.origin,
      path: route,
      clock: createBrowserClock(this._window),
      createSocket: (url) => {
        const socket = new this._window.WebSocket(url);
        socket.addEventListener('close', () => {
          if (!closed) handlers.close();
        });
        return socket;
      },
      onReconcile: handlers.open,
      onMessage: (data) =>
        handlers.message(typeof data === 'string' ? data : new TextDecoder().decode(data)),
    });
    this._events.add(events);
    events.connect();
    return () => {
      if (closed) return;
      closed = true;
      events.dispose();
      this._events.delete(events);
    };
  }

  /**
   * Creates a random operation ID without requiring a secure-context-only browser API.
   *
   * @returns UUID-shaped identifier from getRandomValues.
   * @public
   */
  public createOperationId(): string {
    return createBrowserOperationId(this._window.crypto);
  }

  /**
   * Disposes the single owned SDK session and every event connection.
   *
   * @remarks Disposal cancels owned reads and event retries while preserving the durable host grant.
   * @returns Resolves after SDK cleanup completes.
   * @public
   */
  public async dispose(): Promise<void> {
    if (this._disposed) return;
    this._disposed = true;
    this._detach();
    this._releaseSession?.();
    this._releaseSession = undefined;
    for (const events of this._events) events.dispose();
    this._events.clear();
    this._listeners.clear();
    await this._app.dispose();
  }

  /** Projects the SDK phase and, while it is ready, the session's own reconnects onto the product state. */
  private project(phase: BrowserRemoteAppPhase): void {
    this._releaseSession?.();
    this._releaseSession = undefined;
    const session = phase.kind === 'ready' ? this._app.session : undefined;
    if (session) {
      this._releaseSession = session.subscribe((state) =>
        this.publish(
          state.kind === 'ready'
            ? 'ready'
            : isUnpaired(state.kind)
              ? 'required'
              : state.kind === 'offline' || state.kind === 'disposed'
                ? 'offline'
                : 'connecting',
        ),
      );
      return;
    }
    this.publish(
      phase.kind === 'pairing-required' || (phase.kind === 'error' && phase.reason === 'invitation')
        ? 'required'
        : phase.kind === 'preparing' || phase.kind === 'pending-approval'
          ? 'connecting'
          : 'offline',
    );
  }

  private publish(state: MobileCompanionConnectionState): void {
    if (state === this._state) return;
    this._state = state;
    for (const listener of this._listeners) listener(state);
  }

  private unauthorized(): {
    readonly ok: false;
    readonly status: 401;
    readonly body: { readonly code: string; readonly message: string };
  } {
    return {
      ok: false,
      status: 401,
      body: { code: 'MOBILE_NOT_AUTHORIZED', message: 'This browser is not paired with Symphony.' },
    };
  }
  // #endregion
}

/** Reports whether the session lost its grant, as opposed to only its connection. */
function isUnpaired(kind: RemoteSessionState['kind']): boolean {
  return kind === 'revoked' || kind === 'pairing-required';
}

/** Localized notice for a pairing that failed or lost its answer; the kept fragment lets a reload resume it. */
function pairingIncompleteMessage(): string {
  return translateLabel(
    'loc.symphony.labels.pairing.did.not.complete.reload.this.page.to.try.aga.31f8729',
  );
}
