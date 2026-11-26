// #region Imports
import { DOCUMENT } from '@angular/common';
import { Inject, inject, Injectable } from '@angular/core';
import { RemoteClientError, RemoteSession } from '@pixel-brewery/remote-client';
import {
  BrowserPairingLocation,
  BrowserRemoteConnector,
  BrowserRemoteEvents,
  createBrowserClock,
  createBrowserOperationId,
} from '@pixel-brewery/remote-browser';
import {
  remoteErrorResponseSchema,
  type IRemoteHostIdentity,
  type IRemotePairingBootstrap,
} from '@pixel-brewery/remote-protocol';
import type { IMobileCompanionClient } from './interfaces/IMobileCompanionClient';
import type { IMobileBrowserWindow } from './interfaces/IMobileBrowserWindow';
import type { MobileCompanionConnectionState } from './MobileCompanionConnectionState';
import type { IMobileHttpResponse } from './interfaces/IMobileHttpResponse';
import type { IMobileEventHandlers } from './interfaces/IMobileEventHandlers';
// #endregion

/**
 * Composes SDK pairing, cookie authentication and bounded events for Symphony's browser product port.
 *
 * @remarks Own one instance per browser document and await dispose when its Angular owner exits.
 * The SDK retains authorization and automatic recovery; this adapter projects only product state.
 * @public
 */
@Injectable({ providedIn: 'root' })
export class BrowserMobileCompanionClient implements IMobileCompanionClient {
  // #region Fields
  private readonly _window: IMobileBrowserWindow;
  private readonly _listeners = new Set<(state: MobileCompanionConnectionState) => void>();
  private readonly _events = new Set<BrowserRemoteEvents>();
  private readonly _controller = new AbortController();
  private _session: RemoteSession | undefined;
  private _initialization: Promise<boolean> | undefined;
  private _state: MobileCompanionConnectionState = 'offline';
  private _disposed = false;
  // #endregion
  // #region Ctor
  /**
   * Binds the active browser document without starting a connection.
   *
   * @param document - Browser document supplying same-origin networking and timing APIs.
   * @throws An error when the document has no owning browser window.
   * @public
   */
  public constructor(@Inject(DOCUMENT) document: Document = inject(DOCUMENT)) {
    if (!document.defaultView)
      throw new Error('Mobile companion access requires a browser window.');
    this._window = document.defaultView as IMobileBrowserWindow;
  }
  // #endregion
  // #region Methods
  /**
   * Restores or completes a verified Symphony QR invitation, retaining only a public attempt identifier across tab reloads.
   *
   * @returns True when the SDK session is ready; false when the browser needs another invitation.
   * @throws An error for a disposed client, an invalid invitation or an unavailable or mismatched host.
   * @public
   */
  public initialize(): Promise<boolean> {
    if (this._disposed) return Promise.reject(new Error('The mobile connection is closed.'));
    if (!this._initialization) {
      const operation = this.initializeSession();
      this._initialization = operation;
      void operation
        .finally(() => {
          if (this._initialization === operation) this._initialization = undefined;
        })
        .catch(() => undefined);
    }
    return this._initialization;
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
    if (!(await this.initialize()) || !this._session) return this.unauthorized();
    const encoded = body === undefined ? undefined : new TextEncoder().encode(JSON.stringify(body));
    try {
      const response = await this._session.request({
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
      if (cause instanceof RemoteClientError && cause.code === 'SESSION_REQUIRED')
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
    this._controller.abort();
    for (const events of this._events) events.dispose();
    this._events.clear();
    await this._session?.dispose();
    this._listeners.clear();
  }

  private async initializeSession(): Promise<boolean> {
    const pairing = new BrowserPairingLocation(this._window.location, this._window.history);
    const bootstrap = pairing.read();
    if (bootstrap && bootstrap.appId !== 'symphony')
      throw new Error('The invitation belongs to another application.');
    if (!this._session) {
      const connector = new BrowserRemoteConnector({
        origin: this._window.location.origin,
        fetch: this._window.fetch.bind(this._window),
      });
      const endpoint = {
        id: connector.id,
        transportId: connector.id,
        origin: this._window.location.origin,
      };
      let identity: IRemoteHostIdentity;
      if (bootstrap) identity = { appId: bootstrap.appId, hostId: bootstrap.hostId };
      else {
        const probe = await connector.connect(endpoint, this._controller.signal);
        try {
          identity = (await probe.describe(this._controller.signal)).identity;
        } finally {
          await probe.dispose();
        }
      }
      if (identity.appId !== 'symphony')
        throw new Error('This address is not a Symphony installation.');
      if (this._disposed) return false;
      const attemptId = bootstrap ? this.readAttemptId(bootstrap) : this.createOperationId();
      this._session = new RemoteSession({
        identity,
        endpoint,
        connector,
        clock: createBrowserClock(this._window),
        createId: () => attemptId,
      });
      this._session.subscribe((state) => {
        const projected: MobileCompanionConnectionState =
          state.kind === 'ready'
            ? 'ready'
            : ['pairing-required', 'revoked'].includes(state.kind)
              ? 'required'
              : ['connecting', 'reconnecting', 'pairing', 'pending-approval'].includes(state.kind)
                ? 'connecting'
                : 'offline';
        this._state = projected;
        for (const listener of this._listeners) listener(projected);
      });
    }
    await this._session.initialize();
    if (bootstrap && this._session.state.kind !== 'ready')
      await this._session.pair(
        bootstrap,
        this._window.navigator.platform ? `${this._window.navigator.platform} browser` : 'Browser',
      );
    if (this._session.state.kind === 'ready') {
      if (bootstrap) {
        pairing.clear();
        try {
          this._window.sessionStorage.removeItem('symphony.remote.pending-attempt');
        } catch {
          /* No credential is stored in this optional public-ID cache. */
        }
      }
      return true;
    }
    return false;
  }

  private readAttemptId(bootstrap: IRemotePairingBootstrap): string {
    let attemptId = this.createOperationId();
    try {
      const raw: unknown = JSON.parse(
        this._window.sessionStorage.getItem('symphony.remote.pending-attempt') ?? 'null',
      );
      if (
        raw !== null &&
        typeof raw === 'object' &&
        'hostId' in raw &&
        raw.hostId === bootstrap.hostId &&
        'expiresAt' in raw &&
        raw.expiresAt === bootstrap.expiresAt &&
        'attemptId' in raw &&
        typeof raw.attemptId === 'string' &&
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.test(
          raw.attemptId,
        )
      )
        attemptId = raw.attemptId;
      this._window.sessionStorage.setItem(
        'symphony.remote.pending-attempt',
        JSON.stringify({ hostId: bootstrap.hostId, expiresAt: bootstrap.expiresAt, attemptId }),
      );
    } catch {
      /* The same in-memory SDK attempt still permits recovery when session storage is blocked. */
    }
    return attemptId;
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
