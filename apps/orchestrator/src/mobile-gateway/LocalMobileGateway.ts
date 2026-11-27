// #region Imports
import { NodeRemoteHost, RemoteHostRuntime } from '@pixel-brewery/remote-node/host';
import { createRemotePairingUrl } from '@pixel-brewery/remote-protocol';
import {
  mobileAccessStatusSchema,
  mobilePairingChallengeSchema,
  symphonyRemoteRoutes,
  type MobileAccessStatus,
  type MobilePairingChallenge,
} from '@symphony/mobile-contracts';
import { SymphonyMobileApplicationAdapter } from './SymphonyMobileApplicationAdapter';
import type { ILocalMobileGatewayDependencies } from './interfaces/ILocalMobileGatewayDependencies';
// #endregion

/**
 * Product lifecycle facade around one SDK host runtime, access core and Symphony application adapter.
 *
 * @remarks The SDK runtime serializes every lifecycle and device command and rechecks the private network interface
 * when access is enabled, before every invitation and on an explicit reconcile; nothing polls the network.
 * @public
 */
export class LocalMobileGateway {
  // #region Fields
  private readonly _runtime: RemoteHostRuntime;
  private readonly _listeners = new Set<() => void>();
  private readonly _application: SymphonyMobileApplicationAdapter;
  // #endregion
  // #region Ctor
  /**
   * Composes product policy with SDK network ownership without starting I/O.
   *
   * @param _dependencies - Initialized authority, identity, packaged assets and existing domain callbacks.
   * @public
   */
  public constructor(private readonly _dependencies: ILocalMobileGatewayDependencies) {
    this._application = new SymphonyMobileApplicationAdapter(_dependencies);
    const host = new NodeRemoteHost({
      identity: _dependencies.identity,
      name: _dependencies.desktopName,
      access: _dependencies.access,
      ...(_dependencies.reportRemoteFailure
        ? { reportFailure: _dependencies.reportRemoteFailure }
        : {}),
      routes: symphonyRemoteRoutes,
      application: this._application,
      assetsPath: _dependencies.assetsPath,
      cookieName: 'symphony_mobile',
      contentSecurityPolicy:
        "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self' data:; connect-src 'self' ws: wss:; frame-ancestors 'none'; base-uri 'self'",
      ...(_dependencies.host !== undefined ? { host: _dependencies.host } : {}),
      ...(_dependencies.portStart !== undefined ? { port: _dependencies.portStart } : {}),
      ...(_dependencies.portEnd !== undefined ? { portEnd: _dependencies.portEnd } : {}),
      ...(_dependencies.allowLoopbackForTests !== undefined
        ? { allowLoopbackForTests: _dependencies.allowLoopbackForTests }
        : {}),
    });
    this._runtime = new RemoteHostRuntime(host);
    // The runtime releases this registration when it is disposed.
    this._runtime.subscribe(() => this.notify());
    this._application.subscribeConnections(() => this.notify());
  }
  // #endregion
  // #region Methods
  /**
   * Restores listeners only when the saved activation intent permits it.
   *
   * @returns Resolves after initialization and any requested private binding; a failed restoration is retained
   * in {@link LocalMobileGateway.status} instead of rejecting.
   * @public
   */
  public start(): Promise<void> {
    return this.notifyAfter(this._runtime.initialize());
  }

  /**
   * Durably enables access and binds the selected private interface.
   *
   * @returns Resolves after activation and successful binding; network failure retains the user's enabled intent.
   * @public
   */
  public enable(): Promise<void> {
    return this.notifyAfter(this._runtime.enable());
  }

  /**
   * Stops access and commits disabled intent. A failed write cannot reopen this runtime through background reconciliation.
   *
   * @returns Resolves after listener closure and the durable disabled record.
   * @public
   */
  public disable(): Promise<void> {
    return this.notifyAfter(this._runtime.disable());
  }

  /**
   * Closes owned resources on process shutdown while preserving the saved activation preference.
   *
   * @returns Resolves after SDK requests, events and listeners are closed.
   * @public
   */
  public stop(): Promise<void> {
    return this._runtime.dispose();
  }

  /**
   * Re-evaluates the private interface on startup, resume or unlock; invitations recheck it themselves.
   *
   * @returns Resolves after serialized listener reconciliation.
   * @public
   */
  public reconcile(): Promise<void> {
    return this.notifyAfter(this._runtime.reconcile());
  }

  /**
   * Projects SDK state through the existing local desktop administration contract.
   *
   * @returns Credential-free mobile status, including product event presence and committed last-use observations.
   * @public
   */
  public status(): MobileAccessStatus {
    const state = this._runtime.status();
    const connected = this._application.connectedDeviceIds();
    const runtime =
      state.state === 'rebinding'
        ? 'starting'
        : state.state === 'disposed'
          ? 'disabled'
          : state.state === 'disabled' && state.access.enabled
            ? 'starting'
            : state.state;
    return mobileAccessStatusSchema.parse({
      enabled: state.access.enabled,
      state: runtime,
      ...(state.host.endpoints[0] ? { origin: state.host.endpoints[0].origin } : {}),
      // The SDK host keeps its last error code after a successful disable; only an unavailable host shows it.
      ...(state.errorCode && runtime === 'unavailable'
        ? {
            unavailableReason:
              'Mobile access could not complete its last operation. Retry or check the local network.',
          }
        : {}),
      pendingPairings: [],
      devices: state.access.devices.map((device) => ({
        id: device.id,
        name: device.name,
        pairedAt: device.pairedAt,
        lastSeenAt: this._dependencies.lastSeenAt?.(device.id) ?? device.lastSeenAt,
        connected: connected.has(device.id),
      })),
    });
  }

  /**
   * Creates a short-lived QR invitation; possession authorizes the device without another approval step.
   *
   * @returns A fragment-based URL and exclusive expiry, never a durable device credential.
   * @public
   */
  public async createChallenge(): Promise<MobilePairingChallenge> {
    const bootstrap = await this.notifyAfter(this._runtime.createPairing());
    return mobilePairingChallengeSchema.parse({
      pairingUrl: createRemotePairingUrl(bootstrap),
      expiresAt: bootstrap.expiresAt,
    });
  }

  /**
   * Delegates optional policy approval for existing typed desktop callers.
   *
   * @param pairingId - SDK pending-attempt identifier.
   * @returns Resolves after durable approval; QR-possession does not create pending requests.
   * @public
   */
  public approvePairing(pairingId: string): Promise<void> {
    return this._dependencies.access.approvePairing(pairingId);
  }

  /**
   * Rejects a pending attempt through the serialized SDK authority owner.
   *
   * @param pairingId - SDK pending-attempt identifier.
   * @returns Resolves after invalidation.
   * @public
   */
  public rejectPairing(pairingId: string): Promise<void> {
    return this._dependencies.access.rejectPairing(pairingId);
  }

  /**
   * Removes one durable device grant before the SDK terminates its active requests and events.
   *
   * @param deviceId - Existing paired device identifier.
   * @returns Resolves after commit and stream cancellation.
   * @public
   */
  public revokeDevice(deviceId: string): Promise<void> {
    return this._runtime.revokeDevice(deviceId);
  }

  /**
   * Revokes every device and outstanding invitation without changing activation intent.
   *
   * @returns Resolves after durable removal and stream cancellation.
   * @public
   */
  public revokeAllDevices(): Promise<void> {
    return this._runtime.revokeAllDevices();
  }

  /**
   * Observes changes the desktop shows: SDK access events (a paired or revoked phone, invalidated invitations, a
   * disabled host), phones gaining or losing their event connection and the end of every lifecycle command, so a
   * rebinding that finishes on a new address is shown as well.
   *
   * @param listener - Called synchronously for each change; it reads {@link LocalMobileGateway.status} itself.
   * @returns Idempotent cleanup removing only this registration.
   * @public
   */
  public subscribe(listener: () => void): () => void {
    const registration = (): void => listener();
    this._listeners.add(registration);
    return () => {
      this._listeners.delete(registration);
    };
  }

  /**
   * Delivers the existing product event to current SDK-owned sessions.
   *
   * @public
   */
  public broadcastSnapshotInvalidated(): void {
    this._application.broadcastSnapshotInvalidated();
  }

  /** Notifies once the command settled, whatever its outcome, because a failure can change the shown state too. */
  private notifyAfter<T>(command: Promise<T>): Promise<T> {
    return command.finally(() => this.notify());
  }

  private notify(): void {
    for (const listener of [...this._listeners]) listener();
  }
  // #endregion
}
