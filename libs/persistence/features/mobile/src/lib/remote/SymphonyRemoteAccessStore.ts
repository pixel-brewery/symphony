// #region Imports
import { randomUUID } from 'node:crypto';
import type { IRemoteAccessStore } from '@pixel-brewery/remote-core';
import { JsonRemoteAccessStore } from '@pixel-brewery/remote-node/persistence';
import {
  remoteAccessStateSchema,
  RemoteProtocolError,
  type IRemoteAccessState,
} from '@pixel-brewery/remote-protocol';
import {
  persistedMobileAccessSchema,
  symphonyRemoteCapabilities,
} from '@symphony/mobile-contracts';
// #endregion

/**
 * Single asynchronous file writer for SDK authorization and product last-use metadata.
 *
 * @remarks Legacy SHA-256 hashes are copied without reconstructing credentials. Both formats use version one, so identity presence discriminates them.
 * @public
 */
export class SymphonyRemoteAccessStore implements IRemoteAccessStore {
  // #region Fields
  private readonly _file: JsonRemoteAccessStore;
  private _state: IRemoteAccessState | undefined;
  private _initialization: Promise<IRemoteAccessState> | undefined;
  private _writes: Promise<void> = Promise.resolve();
  // #endregion
  // #region Ctor
  /**
   * Binds the existing Symphony-private authorization file without reading it.
   *
   * @param path - Application-owned mobile-access.json location.
   * @public
   */
  public constructor(path: string) {
    this._file = new JsonRemoteAccessStore(path);
  }
  // #endregion
  // #region Methods
  /**
   * Restores or atomically migrates before constructing the SDK access service.
   *
   * @returns Canonical state containing the durably assigned installation identity.
   * @throws RemoteProtocolError for invalid, foreign or unreadable records; the original file remains intact on migration validation failure.
   * @public
   */
  public initialize(): Promise<IRemoteAccessState> {
    if (this._state) return Promise.resolve(this._state);
    this._initialization ??= this.restore();
    return this._initialization;
  }

  /**
   * Supplies canonical private state to the SDK core after completed migration.
   *
   * @returns The last committed record.
   * @public
   */
  public async load(): Promise<unknown> {
    return this.initialize();
  }

  /**
   * Serializes an authority replacement with product activity observations.
   *
   * @param state - SDK-proposed complete authorization state for this same installation.
   * @returns Resolves after private atomic replacement succeeds.
   * @throws RemoteProtocolError on identity mismatch or persistence failure.
   * @public
   */
  public save(state: IRemoteAccessState): Promise<void> {
    return this.enqueue(async () => {
      const current = await this.initialize();
      if (
        state.identity.appId !== current.identity.appId ||
        state.identity.hostId !== current.identity.hostId
      )
        throw new RemoteProtocolError(
          'persistence',
          'The authorization record belongs to another installation.',
        );
      const next = remoteAccessStateSchema.parse({
        ...state,
        devices: state.devices.map((device) => {
          const observed = current.devices.find((item) => item.id === device.id)?.lastSeenAt;
          return { ...device, ...(observed ? { lastSeenAt: observed } : {}) };
        }),
      });
      await this.write(next);
      this._state = next;
    });
  }

  /**
   * Records authorized product activity through the same writer without adding or reviving grants.
   *
   * @param deviceId - SDK-authenticated device whose existing grant was used.
   * @param at - UTC observation instant supplied by the product runtime.
   * @returns Resolves after the observation commits, or immediately when the grant has already been revoked.
   * @public
   */
  public recordActivity(deviceId: string, at = new Date()): Promise<void> {
    return this.enqueue(async () => {
      const current = await this.initialize();
      if (!current.devices.some((device) => device.id === deviceId)) return;
      const lastSeenAt = at.toISOString();
      const next = remoteAccessStateSchema.parse({
        ...current,
        devices: current.devices.map((device) =>
          device.id === deviceId ? { ...device, lastSeenAt } : device,
        ),
      });
      await this.write(next);
      this._state = next;
    });
  }

  /**
   * Reads committed observational metadata for the host-administration projection.
   *
   * @param deviceId - Existing device identifier.
   * @returns Last committed use time when available.
   * @public
   */
  public lastSeenAt(deviceId: string): string | undefined {
    return this._state?.devices.find((device) => device.id === deviceId)?.lastSeenAt;
  }

  private async restore(): Promise<IRemoteAccessState> {
    try {
      const raw = await this._file.load();
      if (raw !== null && typeof raw === 'object' && Object.hasOwn(raw, 'identity')) {
        const current = remoteAccessStateSchema.parse(raw);
        if (current.identity.appId !== 'symphony') throw new Error('Foreign application identity.');
        this._state = current;
        return current;
      }
      const legacy =
        raw === null
          ? { enabled: false, devices: [] }
          : persistedMobileAccessSchema.strict().parse(raw);
      const next = remoteAccessStateSchema.parse({
        version: 1,
        identity: { appId: 'symphony', hostId: randomUUID() },
        enabled: legacy.enabled,
        devices: legacy.devices.map((device) => ({
          ...device,
          capabilities: symphonyRemoteCapabilities,
        })),
      });
      await this.write(next);
      this._state = next;
      return next;
    } catch {
      throw new RemoteProtocolError(
        'persistence',
        'Symphony could not restore remote access. The existing authorization record has been preserved.',
      );
    }
  }

  private async write(state: IRemoteAccessState): Promise<void> {
    try {
      await this._file.save(state);
    } catch {
      throw new RemoteProtocolError('persistence', 'Symphony could not persist remote access.');
    }
  }

  private enqueue(operation: () => Promise<void>): Promise<void> {
    const result = this._writes.then(operation);
    this._writes = result.then(
      () => undefined,
      () => undefined,
    );
    return result;
  }
  // #endregion
}
