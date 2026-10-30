// #region Imports

import { DOCUMENT } from '@angular/common';
import { DestroyRef, Inject, inject, Injectable, type Signal } from '@angular/core';
import { Command, Hydratable, ViewPresenter } from '@symphony/frontend-core';
import type { MobileAccessStatus, MobilePairingChallenge } from '@symphony/mobile-contracts';
import { MobileAccessStore } from '../state/MobileAccessStore';

// #endregion

/**
 * Presents the Mobile-owned pairing card and scopes its status refresh to the mounted card.
 *
 * @public
 */
@Injectable()
export class MobileSettingsCardViewPresenter extends Hydratable(ViewPresenter) {
  // #region Fields

  private readonly _window: Window;
  private _mobileRefreshTimer: number | undefined;
  private readonly _toggleMobileAccessCommand: Command<boolean> = new Command(
    (enabled) => void this.onExecuteToggleMobileAccessCommand(enabled),
  );
  private readonly _createMobilePairingCommand: Command<void> = new Command(
    () => void this.onExecuteCreateMobilePairingCommand(),
  );
  private readonly _decideMobilePairingCommand: Command<
    readonly [pairingId: string, approved: boolean]
  > = new Command((parameters) => void this.onExecuteDecideMobilePairingCommand(...parameters));
  private readonly _revokeMobileDeviceCommand: Command<string> = new Command(
    (deviceId) => void this.onExecuteRevokeMobileDeviceCommand(deviceId),
  );
  private readonly _revokeAllMobileDevicesCommand: Command<void> = new Command(
    () => void this.onExecuteRevokeAllMobileDevicesCommand(),
  );

  /**
   * Sole Mobile access state and command owner.
   *
   * @public
   * @readonly
   */
  public readonly store: MobileAccessStore;

  // #endregion

  // #region Ctor

  /**
   * Connects feature-owned state and the card's browser lifecycle.
   *
   * @param store - Mobile access owner.
   * @param document - Active renderer document.
   * @param destroyRef - Card destruction lifecycle.
   * @public
   */
  public constructor(
    @Inject(MobileAccessStore) store: MobileAccessStore = inject(MobileAccessStore),
    @Inject(DOCUMENT) document: Document = inject(DOCUMENT),
    @Inject(DestroyRef) destroyRef: DestroyRef = inject(DestroyRef),
  ) {
    super(destroyRef);
    const browserWindow = document.defaultView;
    if (!browserWindow) throw new Error('Mobile pairing requires a browser window.');
    this.store = store;
    this._window = browserWindow;
    this._mobileRefreshTimer = this._window.setInterval(() => {
      if (this.mobileAccess()?.enabled) void this.store.refreshMobileAccess(true);
    }, 2_000);
  }

  // #endregion

  // #region Properties

  /**
   * Current access status and approved or pending phones.
   *
   * @public
   * @readonly
   */
  public get mobileAccess(): Signal<MobileAccessStatus | undefined> {
    return this.store.mobileAccessStatus;
  }

  /**
   * Short-lived challenge displayed by the pairing card.
   *
   * @public
   * @readonly
   */
  public get mobilePairingChallenge(): Signal<MobilePairingChallenge | undefined> {
    return this.store.mobilePairingChallenge;
  }

  /**
   * Toggles desktop access for approved phones.
   *
   * @public
   * @readonly
   */
  public get toggleMobileAccessCommand(): Command<boolean> {
    return this._toggleMobileAccessCommand;
  }

  /**
   * Creates a short-lived pairing challenge.
   *
   * @public
   * @readonly
   */
  public get createMobilePairingCommand(): Command<void> {
    return this._createMobilePairingCommand;
  }

  /**
   * Approves or rejects one pending phone.
   *
   * @public
   * @readonly
   */
  public get decideMobilePairingCommand(): Command<
    readonly [pairingId: string, approved: boolean]
  > {
    return this._decideMobilePairingCommand;
  }

  /**
   * Revokes one paired phone.
   *
   * @public
   * @readonly
   */
  public get revokeMobileDeviceCommand(): Command<string> {
    return this._revokeMobileDeviceCommand;
  }

  /**
   * Revokes all paired phones.
   *
   * @public
   * @readonly
   */
  public get revokeAllMobileDevicesCommand(): Command<void> {
    return this._revokeAllMobileDevicesCommand;
  }

  // #endregion

  // #region Methods

  /**
   * Loads access state once when the card first needs it.
   *
   * @returns Initial state read when no confirmed status exists.
   * @public
   */
  public override onHydrate(): Promise<void> | undefined {
    return this.store.mobileAccessStatus() ? undefined : this.store.refreshMobileAccess();
  }

  /**
   * Stops card-owned polling when the Settings slot is destroyed.
   *
   * @public
   */
  public override dispose(): void {
    if (this._mobileRefreshTimer !== undefined) {
      this._window.clearInterval(this._mobileRefreshTimer);
      this._mobileRefreshTimer = undefined;
    }
    super.dispose();
  }

  private async onExecuteToggleMobileAccessCommand(enabled: boolean): Promise<void> {
    await this.store.setMobileAccess(enabled);
  }

  private async onExecuteCreateMobilePairingCommand(): Promise<void> {
    await this.store.createMobilePairing();
  }

  private async onExecuteDecideMobilePairingCommand(
    pairingId: string,
    approved: boolean,
  ): Promise<void> {
    await this.store.decideMobilePairing(pairingId, approved);
  }

  private async onExecuteRevokeMobileDeviceCommand(deviceId: string): Promise<void> {
    await this.store.revokeMobileDevice(deviceId);
  }

  private async onExecuteRevokeAllMobileDevicesCommand(): Promise<void> {
    await this.store.revokeAllMobileDevices();
  }

  // #endregion
}
