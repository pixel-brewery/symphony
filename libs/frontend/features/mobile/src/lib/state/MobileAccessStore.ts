// #region Imports

import { Inject, inject, Injectable, signal } from '@angular/core';
import type { IMobileAccessOperations } from '@symphony/frontend-core/mobile-access';
import { NotificationService, operatorErrorMessage } from '@symphony/frontend-notification';
import type { MobileAccessStatus, MobilePairingChallenge } from '@symphony/mobile-contracts';
import type { IMobileAccessClient } from '../ports/IMobileAccessClient';
import { MOBILE_ACCESS_CLIENT } from '../ports/MobileAccessClientToken';

// #endregion

/** Owns desktop mobile-access lifecycle and pairing operations. */
@Injectable()
export class MobileAccessStore implements IMobileAccessOperations {
  // #region Fields

  private readonly _mobileAccessStatus = signal<MobileAccessStatus | undefined>(undefined);
  private readonly _mobilePairingChallenge = signal<MobilePairingChallenge | undefined>(undefined);
  private readonly _mobileAccessBusy = signal(false);

  /**
   * Current desktop access status and paired phones.
   *
   * @public
   * @readonly
   */
  public readonly mobileAccessStatus = this._mobileAccessStatus.asReadonly();

  /**
   * Current short-lived pairing challenge.
   *
   * @public
   * @readonly
   */
  public readonly mobilePairingChallenge = this._mobilePairingChallenge.asReadonly();

  /**
   * Shared exclusion for enabling access and generating a pairing challenge.
   *
   * @public
   * @readonly
   */
  public readonly mobileAccessBusy = this._mobileAccessBusy.asReadonly();

  // #endregion

  // #region Ctor

  /**
   * Constructs the mobile-access store.
   *
   * @public
   */
  public constructor(
    @Inject(MOBILE_ACCESS_CLIENT)
    private readonly _client: IMobileAccessClient = inject(MOBILE_ACCESS_CLIENT),
    @Inject(NotificationService)
    private readonly _notifications: Pick<NotificationService, 'showError'> = inject(
      NotificationService,
    ),
  ) {}

  // #endregion

  // #region Methods

  /**
   * Refreshes the mobile access.
   *
   * @param silent - Silent.
   * @public
   */
  public async refreshMobileAccess(silent = false): Promise<void> {
    try {
      this._mobileAccessStatus.set(await this._client.request('mobile-access.status.get', {}));
    } catch (cause) {
      if (!silent) this.showError(cause, 'Unable to load mobile access.');
    }
  }

  /**
   * Sets the mobile access.
   *
   * @param enabled - Enabled.
   * @public
   */
  public async setMobileAccess(enabled: boolean): Promise<boolean> {
    if (this._mobileAccessStatus()?.enabled === enabled) return true;
    if (this._mobileAccessBusy()) return false;
    this._mobileAccessBusy.set(true);
    try {
      this._mobileAccessStatus.set(
        await this._client.request(enabled ? 'mobile-access.enable' : 'mobile-access.disable', {}),
      );
      if (!enabled) this._mobilePairingChallenge.set(undefined);
      return true;
    } catch (cause) {
      this.showError(
        cause,
        enabled ? 'Unable to enable mobile access.' : 'Unable to disable mobile access.',
      );
      return false;
    } finally {
      this._mobileAccessBusy.set(false);
    }
  }

  /**
   * Creates the mobile pairing.
   *
   * @public
   */
  public async createMobilePairing(): Promise<boolean> {
    if (this._mobileAccessBusy()) return false;
    this._mobileAccessBusy.set(true);
    try {
      this._mobilePairingChallenge.set(
        await this._client.request('mobile-access.pairing.create', {}),
      );
      return true;
    } catch (cause) {
      this.showError(cause, 'Unable to create a mobile pairing code.');
      return false;
    } finally {
      this._mobileAccessBusy.set(false);
    }
  }

  /**
   * Returns the decide mobile pairing.
   *
   * @param pairingId - Pairing id.
   * @param approved - Approved.
   * @public
   */
  public async decideMobilePairing(pairingId: string, approved: boolean): Promise<void> {
    try {
      this._mobileAccessStatus.set(
        await this._client.request(
          approved ? 'mobile-access.pairing.approve' : 'mobile-access.pairing.reject',
          { pairingId },
        ),
      );
    } catch (cause) {
      this.showError(cause, 'Unable to update the mobile pairing request.');
    }
  }

  /**
   * Revokes the mobile device.
   *
   * @param deviceId - Device id.
   * @public
   */
  public async revokeMobileDevice(deviceId: string): Promise<void> {
    try {
      this._mobileAccessStatus.set(
        await this._client.request('mobile-access.device.revoke', { deviceId }),
      );
    } catch (cause) {
      this.showError(cause, 'Unable to revoke the paired phone.');
    }
  }

  /**
   * Revokes the all mobile devices.
   *
   * @public
   */
  public async revokeAllMobileDevices(): Promise<void> {
    try {
      this._mobileAccessStatus.set(
        await this._client.request('mobile-access.devices.revoke-all', {}),
      );
    } catch (cause) {
      this.showError(cause, 'Unable to revoke paired phones.');
    }
  }

  private showError(cause: unknown, fallback: string): void {
    this._notifications.showError(fallback, operatorErrorMessage(cause));
  }

  // #endregion
}
