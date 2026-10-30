// #region Imports

import { DOCUMENT } from '@angular/common';
import { computed, inject, Injectable } from '@angular/core';
import { Hydratable, ViewPresenter } from '@symphony/frontend-core';
import { SettingsHostSession } from '@symphony/frontend-setting';
import { AUTOMATION_SETTINGS_CONTEXT } from '../ports/AutomationSettingsContextToken';
import { AutomationSettingsStore } from '../state/AutomationSettingsStore';

// #endregion

/**
 * Presents measured storage and the same runtime policy draft as Automation.
 *
 * @public
 */
@Injectable()
export class StorageSafetySettingsViewPresenter extends Hydratable(ViewPresenter) {
  // #region Fields

  private readonly _draft = inject(AutomationSettingsStore);
  private readonly _window: Window;
  private _storageRefreshTimer: number | undefined;
  /**
   * Existing storage projection and settings writer activity.
   *
   * @public
   * @readonly
   */
  public readonly store = inject(AUTOMATION_SETTINGS_CONTEXT);
  /**
   * Shared editable runtime policy.
   *
   * @public
   * @readonly
   */
  public readonly runtime = this._draft.runtime;
  /**
   * Updates the shared runtime draft.
   *
   * @public
   * @readonly
   */
  public readonly updateRuntimeNumberCommand = this._draft.updateRuntimeNumberCommand;
  /**
   * Saves through the single settings writer.
   *
   * @public
   * @readonly
   */
  public readonly saveRuntimeCommand = this._draft.saveRuntimeCommand;
  private readonly _globalStorage = computed(() => this.resolveGlobalStorage());

  private readonly _storageMeasured = computed(() => this.resolveStorageMeasured());

  private readonly _filesystemStorage = computed(() => this.resolveFilesystemStorage());

  // #endregion

  // #region Ctor

  /**
   * Joins the route draft and scopes storage polling to the mounted card.
   *
   * @public
   */
  public constructor() {
    super();
    this._draft.beginSession(inject(SettingsHostSession));
    const browserWindow = inject(DOCUMENT).defaultView;
    if (!browserWindow) throw new Error('Storage settings require a browser window.');
    this._window = browserWindow;
    this._storageRefreshTimer = this._window.setInterval(
      () => void this.store.refreshStorageStatus(true),
      5_000,
    );
  }

  // #endregion

  // #region Properties

  /**
   * The globalStorage projection.
   *
   * @public
   * @readonly
   */
  public get globalStorage() {
    return this._globalStorage;
  }

  /**
   * The storageMeasured projection.
   *
   * @public
   * @readonly
   */
  public get storageMeasured() {
    return this._storageMeasured;
  }

  /**
   * The filesystemStorage projection.
   *
   * @public
   * @readonly
   */
  public get filesystemStorage() {
    return this._filesystemStorage;
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

  /**
   * Returns the global storage.
   *
   * @private
   */
  private resolveGlobalStorage() {
    return this.store.storageStatus()?.global;
  }

  /**
   * Whether a completed walk backs the reported allocations; see StorageGovernor.
   *
   * @private
   */
  private resolveStorageMeasured(): boolean {
    return this.store.storageStatus()?.measured ?? false;
  }

  /**
   * Returns the filesystem storage.
   *
   * @private
   */
  private resolveFilesystemStorage() {
    return this.store.storageStatus()?.filesystem;
  }

  // #endregion
}
