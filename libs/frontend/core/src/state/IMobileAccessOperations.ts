// #region Imports

import type { Signal } from '@angular/core';
import type { MobileAccessStatus, MobilePairingChallenge } from '@symphony/mobile-contracts';

// #endregion

/**
 * Mobile access capabilities consumed by desktop composition.
 *
 * @public
 */
export interface IMobileAccessOperations {
  readonly mobileAccessStatus: Signal<MobileAccessStatus | undefined>;
  readonly mobilePairingChallenge: Signal<MobilePairingChallenge | undefined>;
  readonly mobileAccessBusy: Signal<boolean>;
  refreshMobileAccess(silent?: boolean): Promise<void>;
  setMobileAccess(enabled: boolean): Promise<boolean>;
  createMobilePairing(): Promise<boolean>;
  decideMobilePairing(pairingId: string, approved: boolean): Promise<void>;
  revokeMobileDevice(deviceId: string): Promise<void>;
  revokeAllMobileDevices(): Promise<void>;
}
