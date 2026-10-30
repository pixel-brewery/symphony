// #region Imports

import {
  defaultPersistedMobileAccess,
  type MobileAccessRuntimeState,
  type MobileAccessStatus,
  mobileAccessStatusSchema,
  type MobilePairingChallenge,
  mobilePairingChallengeSchema,
  type MobilePairingProposal,
  mobilePairingProposalSchema,
  type MobilePairingStatus,
  mobilePairingStatusSchema,
  type PersistedMobileAccess,
  persistedMobileAccessSchema,
} from '@symphony/mobile-contracts';
import type { IMobileAccessServiceDependencies } from './IMobileAccessServiceDependencies';

// #endregion

/**
 * Owns mobile-access activation, expiring pairing challenges and paired-device authorization.
 *
 * @public
 */
export class MobileAccessService {
  // #region Fields

  private _settings: PersistedMobileAccess;
  private _runtime: IRuntimeStatus = { state: 'disabled' };
  private readonly _challenges = new Map<string, IPairingChallenge>();
  private readonly _pendingPairings = new Map<string, IPendingPairing>();
  private readonly _connectedDeviceIds = new Set<string>();

  // #endregion

  // #region Ctor

  /**
   * Restores validated access settings and their existing startup state.
   *
   * @param _dependencies - Persistent state, security operations and deterministic time.
   * @public
   */
  public constructor(private readonly _dependencies: IMobileAccessServiceDependencies) {
    this._settings = persistedMobileAccessSchema.parse(
      _dependencies.repository.load() ?? defaultPersistedMobileAccess,
    );
    if (this._settings.enabled) this._runtime = { state: 'starting' };
  }

  // #endregion

  // #region Methods

  /**
   * Whether it is enabled.
   *
   * @public
   */
  public isEnabled(): boolean {
    return this._settings.enabled;
  }

  /**
   * Returns the status.
   *
   * @public
   */
  public status(): MobileAccessStatus {
    this.pruneExpiredPairings();
    return mobileAccessStatusSchema.parse({
      enabled: this._settings.enabled,
      ...this._runtime,
      pendingPairings: [...this._pendingPairings.values()]
        .filter((pairing) => pairing.state === 'pending')
        .map((pairing) => ({
          id: pairing.id,
          deviceName: pairing.deviceName,
          verificationCode: pairing.verificationCode,
          requestedAt: pairing.requestedAt,
          expiresAt: pairing.expiresAt,
        })),
      devices: this._settings.devices.map((device) => ({
        id: device.id,
        name: device.name,
        pairedAt: device.pairedAt,
        lastSeenAt: device.lastSeenAt,
        connected: this._connectedDeviceIds.has(device.id),
      })),
    });
  }

  /**
   * Enables.
   *
   * @public
   */
  public enable(): void {
    if (this._settings.enabled) return;
    this._settings = this._dependencies.repository.save({ ...this._settings, enabled: true });
    this._runtime = { state: 'starting' };
  }

  /**
   * Disables.
   *
   * @public
   */
  public disable(): void {
    if (this._settings.enabled) {
      this._settings = this._dependencies.repository.save({ ...this._settings, enabled: false });
    }
    this._runtime = { state: 'disabled' };
    this._challenges.clear();
    this._pendingPairings.clear();
    this._connectedDeviceIds.clear();
  }

  /**
   * Sets the runtime.
   *
   * @param state - State.
   * @param details - Details.
   * @public
   */
  public setRuntime(
    state: MobileAccessRuntimeState,
    details: { readonly origin?: string; readonly unavailableReason?: string } = {},
  ): void {
    this._runtime = { state, ...details };
  }

  /**
   * Creates the challenge.
   *
   * @public
   */
  public createChallenge(): MobilePairingChallenge {
    if (this._runtime.state !== 'available' || !this._runtime.origin) {
      throw new Error('Mobile access is not available on the current network.');
    }
    this.pruneExpiredPairings();
    const secret = this._dependencies.security.randomToken();
    const expiresAt = new Date(
      this._dependencies.now().getTime() + PAIRING_LIFETIME_MS,
    ).toISOString();
    const secretHash = this._dependencies.security.hash(secret);
    this._challenges.set(secretHash, {
      secretHash,
      expiresAt,
    });
    return mobilePairingChallengeSchema.parse({
      pairingUrl: `${this._runtime.origin}/pair#pair=${encodeURIComponent(secret)}`,
      expiresAt,
    });
  }

  /**
   * Returns the propose pairing.
   *
   * @param secret - Secret.
   * @param deviceName - Device name.
   * @public
   */
  public proposePairing(secret: string, deviceName: string): MobilePairingProposal {
    this.requireEnabled();
    this.pruneExpiredPairings();
    const secretHash = this._dependencies.security.hash(secret);
    const normalizedDeviceName = deviceName.trim();
    const existing = [...this._pendingPairings.values()].find(
      (pairing) => pairing.secretHash === secretHash && pairing.deviceName === normalizedDeviceName,
    );
    if (existing) {
      return mobilePairingProposalSchema.parse({
        pairingId: existing.id,
        verificationCode: existing.verificationCode,
        expiresAt: existing.expiresAt,
      });
    }
    const challenge = this._challenges.get(secretHash);
    if (!challenge) throw new Error('The pairing code is invalid or has expired.');
    this._challenges.delete(secretHash);
    const requestedAt = this._dependencies.now().toISOString();
    const id = this._dependencies.security.randomToken();
    const verificationCode = this.verificationCode(secret, id);
    const pending: IPendingPairing = {
      id,
      secretHash,
      deviceName: normalizedDeviceName,
      verificationCode,
      requestedAt,
      expiresAt: challenge.expiresAt,
      state: 'pending',
    };
    this._pendingPairings.set(id, pending);
    return mobilePairingProposalSchema.parse({
      pairingId: id,
      verificationCode,
      expiresAt: challenge.expiresAt,
    });
  }

  /**
   * Returns the pairing status.
   *
   * @param pairingId - Pairing id.
   * @param secret - Secret.
   * @public
   */
  public pairingStatus(pairingId: string, secret: string): MobilePairingStatus {
    const pairing = this._pendingPairings.get(pairingId);
    if (!pairing || pairing.secretHash !== this._dependencies.security.hash(secret)) {
      return mobilePairingStatusSchema.parse({ state: 'expired' });
    }
    if (Date.parse(pairing.expiresAt) <= this._dependencies.now().getTime()) {
      this._pendingPairings.delete(pairingId);
      return mobilePairingStatusSchema.parse({ state: 'expired' });
    }
    if (pairing.state === 'rejected') {
      return mobilePairingStatusSchema.parse({ state: 'rejected' });
    }
    if (pairing.state === 'approved' && pairing.deviceId && pairing.token) {
      const result = mobilePairingStatusSchema.parse({
        state: 'approved',
        deviceId: pairing.deviceId,
        token: pairing.token,
      });
      return result;
    }
    return mobilePairingStatusSchema.parse({ state: 'pending' });
  }

  /**
   * Approves the pairing.
   *
   * @param pairingId - Pairing id.
   * @public
   */
  public approvePairing(pairingId: string): void {
    this.requireEnabled();
    this.pruneExpiredPairings();
    const pairing = this._pendingPairings.get(pairingId);
    if (!pairing || pairing.state !== 'pending') {
      throw new Error('The pairing request is no longer pending.');
    }
    const token = this._dependencies.security.randomToken();
    const deviceId = this._dependencies.security.randomToken();
    const pairedAt = this._dependencies.now().toISOString();
    this._settings = this._dependencies.repository.save({
      ...this._settings,
      devices: [
        ...this._settings.devices,
        {
          id: deviceId,
          name: pairing.deviceName,
          tokenHash: this._dependencies.security.hash(token),
          pairedAt,
        },
      ],
    });
    pairing.state = 'approved';
    pairing.deviceId = deviceId;
    pairing.token = token;
  }

  /**
   * Rejects the pairing.
   *
   * @param pairingId - Pairing id.
   * @public
   */
  public rejectPairing(pairingId: string): void {
    const pairing = this._pendingPairings.get(pairingId);
    if (!pairing || pairing.state !== 'pending') {
      throw new Error('The pairing request is no longer pending.');
    }
    pairing.state = 'rejected';
  }

  /**
   * Returns the authorize.
   *
   * @param token - Token.
   * @public
   */
  public authorize(token: string): string {
    this.requireEnabled();
    const tokenHash = this._dependencies.security.hash(token);
    const device = this._settings.devices.find((candidate) => candidate.tokenHash === tokenHash);
    if (!device) throw new Error('This phone is not authorized for mobile access.');
    const lastSeenAt = this._dependencies.now().toISOString();
    this._settings = this._dependencies.repository.save({
      ...this._settings,
      devices: this._settings.devices.map((candidate) =>
        candidate.id === device.id ? { ...candidate, lastSeenAt } : candidate,
      ),
    });
    return device.id;
  }

  /**
   * Sets the device connected.
   *
   * @param deviceId - Device id.
   * @param connected - Connected.
   * @public
   */
  public setDeviceConnected(deviceId: string, connected: boolean): void {
    if (connected) this._connectedDeviceIds.add(deviceId);
    else this._connectedDeviceIds.delete(deviceId);
  }

  /**
   * Revokes the device.
   *
   * @param deviceId - Device id.
   * @public
   */
  public revokeDevice(deviceId: string): void {
    const devices = this._settings.devices.filter((device) => device.id !== deviceId);
    if (devices.length === this._settings.devices.length) {
      throw new Error('The paired device does not exist.');
    }
    this._settings = this._dependencies.repository.save({ ...this._settings, devices });
    this._connectedDeviceIds.delete(deviceId);
  }

  /**
   * Revokes the all devices.
   *
   * @public
   */
  public revokeAllDevices(): void {
    this._settings = this._dependencies.repository.save({ ...this._settings, devices: [] });
    this._connectedDeviceIds.clear();
  }

  private verificationCode(secret: string, pairingId: string): string {
    const digest = this._dependencies.security.hash(`${secret}:${pairingId}`);
    const numeric = Number.parseInt(digest.slice(0, 12), 16) % 1_000_000;
    return numeric.toString().padStart(6, '0');
  }

  private pruneExpiredPairings(): void {
    const now = this._dependencies.now().getTime();
    for (const [hash, challenge] of this._challenges) {
      if (Date.parse(challenge.expiresAt) <= now) this._challenges.delete(hash);
    }
    for (const [id, pairing] of this._pendingPairings) {
      if (Date.parse(pairing.expiresAt) <= now) this._pendingPairings.delete(id);
    }
  }

  private requireEnabled(): void {
    if (!this._settings.enabled) throw new Error('Mobile access is disabled.');
  }

  // #endregion
}

const PAIRING_LIFETIME_MS = 5 * 60_000;

interface IRuntimeStatus {
  readonly state: MobileAccessRuntimeState;
  readonly origin?: string;
  readonly unavailableReason?: string;
}

interface IPairingChallenge {
  readonly secretHash: string;
  readonly expiresAt: string;
}

interface IPendingPairing {
  readonly id: string;
  readonly secretHash: string;
  readonly deviceName: string;
  readonly verificationCode: string;
  readonly requestedAt: string;
  readonly expiresAt: string;
  state: 'pending' | 'approved' | 'rejected';
  deviceId?: string;
  token?: string;
}
