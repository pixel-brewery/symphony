// #region Imports

import { DOCUMENT } from '@angular/common';
import { computed, inject, Injectable } from '@angular/core';
import { Command, Hydratable, ViewPresenter } from '@symphony/frontend-core';
import {
  createImmediateSetting,
  mosaikEventValue,
  SettingsHostSession,
  type IImmediateSetting,
} from '@symphony/frontend-setting';
import type { ApplicationSettingsDto } from '@symphony/ipc-contracts-composition';
import { AUTOMATION_SETTINGS_CONTEXT } from '../ports/AutomationSettingsContextToken';
import type { IStorageShare } from './IStorageShare';

// #endregion

/** A storage limit that applies when its number box commits. */
interface IStorageLimit {
  readonly setting: IImmediateSetting<number>;
  readonly minimum: number;
  readonly maximum: number;
  readonly write: (settings: ApplicationSettingsDto, value: number) => ApplicationSettingsDto;
}

/**
 * System › `Storage`: the single storage picture of this Mac — all managed data, each workspace's
 * share, Local GitHub Actions with its breakdown and limit, the managed limit and the free-space
 * reserve. Every limit applies when its number box commits.
 *
 * @public
 */
@Injectable()
export class StorageSafetySettingsViewPresenter extends Hydratable(ViewPresenter) {
  // #region Fields

  private readonly _session = inject(SettingsHostSession);
  private readonly _window: Window;
  private _storageRefreshTimer: number | undefined;

  /**
   * Settings, measured storage and the settings writer.
   *
   * @public
   * @readonly
   */
  public readonly store = inject(AUTOMATION_SETTINGS_CONTEXT);

  /**
   * All managed Symphony data on this Mac.
   *
   * @public
   * @readonly
   */
  public readonly globalStorage = computed(() => this.store.storageStatus()?.global);

  /**
   * Whether a completed walk backs the reported allocations.
   *
   * @public
   * @readonly
   */
  public readonly storageMeasured = computed(() => this.store.storageStatus()?.measured ?? false);

  /**
   * Free space of the Mac's volume and its protected reserve.
   *
   * @public
   * @readonly
   */
  public readonly filesystemStorage = computed(() => this.store.storageStatus()?.filesystem);

  /**
   * Local GitHub Actions' measured storage.
   *
   * @public
   * @readonly
   */
  public readonly localCiStorage = computed(() => this.store.storageStatus()?.localCi);

  /**
   * Each workspace's share with its own limit.
   *
   * @public
   * @readonly
   */
  public readonly workspaceShares = computed<readonly (IStorageShare & { readonly id: string })[]>(
    () => {
      const status = this.store.storageStatus();
      return (this.store.settings()?.workspaces ?? []).map((workspace) => ({
        id: workspace.id,
        label: workspace.displayName,
        allocatedBytes: status?.measured
          ? (status.workspaces.find((usage) => usage.workspaceId === workspace.id)
              ?.allocatedBytes ?? 0)
          : undefined,
        limitGiB: workspace.storageLimitGiB,
      }));
    },
  );

  /**
   * The workspace using the most storage, whose Administration the row opens.
   *
   * @public
   * @readonly
   */
  public readonly largestWorkspace = computed(() =>
    this.workspaceShares().reduce<(IStorageShare & { readonly id: string }) | undefined>(
      (largest, share) =>
        !largest || (share.allocatedBytes ?? 0) > (largest.allocatedBytes ?? 0) ? share : largest,
      undefined,
    ),
  );

  /**
   * Local GitHub Actions' categories that hold data.
   *
   * @public
   * @readonly
   */
  public readonly localCiShares = computed<readonly IStorageShare[]>(() =>
    this.storageMeasured()
      ? (this.localCiStorage()?.segments ?? [])
          .filter((segment) => segment.allocatedBytes > 0)
          .map((segment) => ({
            label: segment.label.charAt(0).toLocaleLowerCase() + segment.label.slice(1),
            allocatedBytes: segment.allocatedBytes,
          }))
      : [],
  );

  /**
   * `Maximum managed storage (GB)`.
   *
   * @public
   * @readonly
   */
  public readonly managedLimit = this.limit(
    5,
    2048,
    (settings) => settings.runtime.managedStorageLimitGiB,
    (settings, value) => ({
      ...settings,
      runtime: { ...settings.runtime, managedStorageLimitGiB: value },
    }),
  );

  /**
   * `Minimum Mac free space (GB)`.
   *
   * @public
   * @readonly
   */
  public readonly minimumFreeDisk = this.limit(
    5,
    512,
    (settings) => settings.runtime.minimumFreeDiskGiB,
    (settings, value) => ({
      ...settings,
      runtime: { ...settings.runtime, minimumFreeDiskGiB: value },
    }),
  );

  /**
   * `Maximum Local GitHub Actions storage (GB)`.
   *
   * @public
   * @readonly
   */
  public readonly localCiLimit = this.limit(
    8,
    256,
    (settings) => settings.localCi.storageLimitGiB,
    (settings, value) => ({
      ...settings,
      localCi: { ...settings.localCi, storageLimitGiB: value },
    }),
  );

  /**
   * Applies a committed limit: `[limit, event]`.
   *
   * @public
   * @readonly
   */
  public readonly commitLimitCommand = new Command<readonly [limit: IStorageLimit, event: unknown]>(
    ([limit, event]) => {
      const value = Number(mosaikEventValue(event));
      const stored = limit.setting.value();
      const next =
        Number.isFinite(value) && value >= limit.minimum && value <= limit.maximum
          ? Math.round(value)
          : stored;
      void limit.setting.apply(next, async (accepted) => {
        const current = this.store.settings();
        return current ? this.store.saveSettings(limit.write(current, accepted)) : false;
      });
    },
  );

  /**
   * Opens a workspace's Administration, where its storage limit is set.
   *
   * @public
   * @readonly
   */
  public readonly openWorkspaceAdministrationCommand = new Command<string>((workspaceId) =>
    this._session.openWorkspace(workspaceId, 'administration'),
  );

  // #endregion

  // #region Ctor

  /**
   * Scopes storage polling to the mounted card.
   *
   * @public
   */
  public constructor() {
    super();
    const browserWindow = inject(DOCUMENT).defaultView;
    if (!browserWindow) throw new Error('Storage settings require a browser window.');
    this._window = browserWindow;
    this._storageRefreshTimer = this._window.setInterval(
      () => void this.store.refreshStorageStatus(true),
      5_000,
    );
  }

  // #endregion

  // #region Methods

  /**
   * Hydrates only when authoritative settings have not loaded.
   *
   * @public
   */
  public override onHydrate(): Promise<void> | undefined {
    return this.store.settings() ? undefined : this.store.refreshConfiguration();
  }

  /**
   * Releases the mounted card's measurement timer.
   *
   * @public
   */
  public override dispose(): void {
    if (this._storageRefreshTimer !== undefined) {
      this._window.clearInterval(this._storageRefreshTimer);
      this._storageRefreshTimer = undefined;
    }
    super.dispose();
  }

  private limit(
    minimum: number,
    maximum: number,
    read: (settings: ApplicationSettingsDto) => number,
    write: (settings: ApplicationSettingsDto, value: number) => ApplicationSettingsDto,
  ): IStorageLimit {
    const settings = this.store.settings;
    return {
      setting: createImmediateSetting(() => {
        const current = settings();
        return current ? read(current) : 0;
      }),
      minimum,
      maximum,
      write,
    };
  }

  // #endregion
}
