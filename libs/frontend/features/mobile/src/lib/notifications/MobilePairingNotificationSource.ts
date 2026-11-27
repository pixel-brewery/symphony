// #region Imports

import { computed, inject, Injectable } from '@angular/core';
import type { INotificationItem, INotificationSource } from '@symphony/frontend-notification';
import { MobileAccessStore } from '../state/MobileAccessStore';
import { translateLabel } from '@symphony/frontend-intl/labels';

// #endregion

const ITEM_PREFIX = 'mobile-pairing:';

/**
 * Reports phones that ask to pair with this Mac. The fixes approve or reject the request with
 * the same commands as `Mobile access` in Settings. The store follows the desktop's change
 * notices, so the source reads the status once when it connects and never on a timer.
 *
 * @public
 */
@Injectable()
export class MobilePairingNotificationSource implements INotificationSource {
  // #region Fields

  private readonly _store = inject(MobileAccessStore);
  private _connected = false;

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
      get title() {
        return translateLabel('loc.symphony.labels.asks.to.pair.e6bc5ce', pairing.deviceName);
      },
      location: ['Mobile access'],
      get detail() {
        return translateLabel(
          'loc.symphony.labels.verification.code.578f691',
          pairing.verificationCode,
        );
      },
      scope: { kind: 'mac' },
      actions: [
        {
          id: 'reject',
          get label() {
            return translateLabel('loc.symphony.labels.reject.ab604a3');
          },
          emphasis: 'danger',
        },
        {
          id: 'approve',
          get label() {
            return translateLabel('loc.symphony.labels.approve.6007acb');
          },
          emphasis: 'primary',
        },
      ],
    }));
  });

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
   * Reads the current pairing requests once; later changes arrive through the store's change notices.
   *
   * @public
   */
  public connect(): void {
    if (this._connected) return;
    this._connected = true;
    void this.refresh();
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

  // #endregion
}
