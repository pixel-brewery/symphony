// #region Imports

import { DestroyRef, Inject, inject, Injectable, type Signal } from '@angular/core';
import { Command, Hydratable, ViewPresenter } from '@symphony/frontend-core';
import { createImmediateSetting, SettingsAlertService } from '@symphony/frontend-setting';
import type { MobileAccessStatus, MobilePairingChallenge } from '@symphony/mobile-contracts';
import { MobileAccessStore } from '../state/MobileAccessStore';
import { translateLabel } from '@symphony/frontend-intl/labels';

// #endregion

/**
 * Presents the Mobile-owned pairing card; the store keeps its status current from the desktop's change notices.
 *
 * @public
 */
@Injectable()
export class MobileSettingsCardViewPresenter extends Hydratable(ViewPresenter) {
  // #region Fields

  private readonly _alerts: SettingsAlertService;
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

  /**
   * The `Allow mobile access` switch: applied at once, restored when the change fails.
   *
   * @public
   * @readonly
   */
  public readonly enabled = createImmediateSetting(
    () => this.store.mobileAccessStatus()?.enabled ?? false,
  );

  // #endregion

  // #region Ctor

  /**
   * Connects feature-owned state and the card's lifecycle.
   *
   * @param store - Mobile access owner.
   * @param destroyRef - Card destruction lifecycle.
   * @param alerts - Settings alert sheets that confirm revoking phones.
   * @public
   */
  public constructor(
    @Inject(MobileAccessStore) store: MobileAccessStore = inject(MobileAccessStore),
    @Inject(DestroyRef) destroyRef: DestroyRef = inject(DestroyRef),
    @Inject(SettingsAlertService) alerts: SettingsAlertService = inject(SettingsAlertService),
  ) {
    super(destroyRef);
    this.store = store;
    this._alerts = alerts;
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
   * Reads access state once when the card mounts; afterwards the store follows the desktop's change notices.
   *
   * @returns The initial read when no confirmed status exists; a cached status is shown at once and read again
   * silently.
   * @public
   */
  public override onHydrate(): Promise<void> | undefined {
    if (!this.store.mobileAccessStatus()) return this.store.refreshMobileAccess();
    void this.store.refreshMobileAccess(true);
    return undefined;
  }

  private async onExecuteToggleMobileAccessCommand(enabled: boolean): Promise<void> {
    await this.enabled.apply(enabled, (next) => this.store.setMobileAccess(next));
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
    const device = this.mobileAccess()?.devices.find((candidate) => candidate.id === deviceId);
    if (!device) return;
    const confirmed = await this._alerts.confirm({
      id: `revoke-mobile-device-${deviceId}`,
      header: translateLabel('loc.symphony.labels.revoke.fa89b5d', device.name),
      get message() {
        return translateLabel(
          'loc.symphony.labels.the.phone.loses.access.at.once.and.its.connection.en.153f244',
        );
      },
      tone: 'danger',
      confirmLabel: translateLabel('loc.symphony.labels.revoke.87e6d00'),
      cancelLabel: translateLabel('loc.symphony.labels.keep.access.68cfc92'),
      destructive: true,
    });
    if (confirmed) await this.store.revokeMobileDevice(deviceId);
  }

  private async onExecuteRevokeAllMobileDevicesCommand(): Promise<void> {
    const count = this.mobileAccess()?.devices.length ?? 0;
    if (!count) return;
    const confirmed = await this._alerts.confirm({
      id: 'revoke-all-mobile-devices',
      header: translateLabel('loc.symphony.labels.revoke.all.phones.85f9237', count),
      get message() {
        return translateLabel(
          'loc.symphony.labels.every.paired.phone.loses.access.at.once.and.its.conn.64f3774',
        );
      },
      tone: 'danger',
      confirmLabel: translateLabel('loc.symphony.labels.revoke.all.phones.7bfa7ab'),
      cancelLabel: translateLabel('loc.symphony.labels.keep.access.68cfc92'),
      destructive: true,
    });
    if (confirmed) await this.store.revokeAllMobileDevices();
  }

  // #endregion
}
