// #region Imports

import { DOCUMENT } from '@angular/common';
import { computed, DestroyRef, inject, Injectable } from '@angular/core';
import type { INotificationItem, INotificationSource } from '@symphony/frontend-notification';
import { MobileAccessStore } from '../state/MobileAccessStore';

// #endregion

const ITEM_PREFIX = 'mobile-pairing:';

/** While mobile access is on, a phone waiting to pair should appear within seconds. */
const ENABLED_POLL_MILLISECONDS = 4_000;

/** While it is off nothing can pair; a slow check notices when it is switched on elsewhere. */
const DISABLED_POLL_MILLISECONDS = 60_000;

/**
 * Reports phones that ask to pair with this Mac. The fixes approve or reject the request with
 * the same commands as `Mobile access` in Settings. Pairing requests arrive from the phone, so
 * the source checks for them itself while it is connected.
 *
 * @public
 */
@Injectable()
export class MobilePairingNotificationSource implements INotificationSource {
  // #region Fields

  private readonly _store = inject(MobileAccessStore);
  private readonly _window = inject(DOCUMENT).defaultView;
  private _timer?: number;
  private _connected = false;
  private _disposed = false;

  /**
   * One item per pending pairing request.
   *
   * @public
   * @readonly
   */
  public readonly items = computed<readonly INotificationItem[]>(() => {
    const status = this._store.mobileAccessStatus();
    if (!status?.enabled) return [];
    return status.pendingPairings.map((pairing): INotificationItem => ({
      id: `${ITEM_PREFIX}${pairing.id}`,
      severity: 'info',
      title: `${pairing.deviceName} asks to pair`,
      location: ['Mobile access'],
      detail: `verification code ${pairing.verificationCode}`,
      scope: { kind: 'mac' },
      actions: [
        { id: 'reject', label: 'Reject', emphasis: 'danger' },
        { id: 'approve', label: 'Approve', emphasis: 'primary' },
      ],
    }));
  });

  // #endregion

  // #region Ctor

  /**
   * Constructs the source and stops its checks with the window.
   *
   * @public
   */
  public constructor() {
    inject(DestroyRef).onDestroy(() => {
      this._disposed = true;
      if (this._timer !== undefined) this._window?.clearTimeout(this._timer);
    });
  }

  // #endregion

  // #region Methods

  /**
   * Reads mobile access and its pairing requests again without reporting a failure.
   *
   * @public
   */
  public refresh(): Promise<void> {
    return this._store.refreshMobileAccess(true);
  }

  /**
   * Starts checking for pairing requests for as long as the window lives.
   *
   * @public
   */
  public connect(): void {
    if (this._connected || this._disposed) return;
    this._connected = true;
    void this.poll();
  }

  /**
   * Approves or rejects the pairing request.
   *
   * @param itemId - Identifier of a pairing item.
   * @param actionId - `approve` or `reject`.
   * @public
   */
  public async perform(itemId: string, actionId: string): Promise<void> {
    if (actionId !== 'approve' && actionId !== 'reject') return;
    await this._store.decideMobilePairing(itemId.slice(ITEM_PREFIX.length), actionId === 'approve');
  }

  private async poll(): Promise<void> {
    await this.refresh();
    if (this._disposed || !this._window) return;
    this._timer = this._window.setTimeout(
      () => void this.poll(),
      this._store.mobileAccessStatus()?.enabled
        ? ENABLED_POLL_MILLISECONDS
        : DISABLED_POLL_MILLISECONDS,
    );
  }

  // #endregion
}
