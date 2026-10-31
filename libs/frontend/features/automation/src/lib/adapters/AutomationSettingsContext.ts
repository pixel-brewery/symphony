// #region Imports

import { Inject, inject, Injectable, Injector } from '@angular/core';
import type { ApplicationSettingsDto } from '@symphony/ipc-contracts-composition';
import { AUTOMATION_PREPARATION } from '@symphony/frontend-core/automation';
import { ConfigurationStore } from '@symphony/frontend-core/configuration';
import { WORKSPACE_OPERATIONS } from '@symphony/frontend-core/workspace';

// #endregion

/**
 * Supplies Automation policy editing from the single writer and actual Workspace capabilities.
 *
 * @public
 */
@Injectable()
export class AutomationSettingsContext {
  // #region Ctor

  /**
   * Connects authoritative projections without copying policy drafts or writable flags.
   *
   * @public
   */
  public constructor(
    @Inject(ConfigurationStore)
    private readonly _configuration: ConfigurationStore = inject(ConfigurationStore),
    @Inject(Injector) private readonly _injector: Injector = inject(Injector),
  ) {}

  // #endregion

  // #region Properties

  /**
   * Authoritative settings behind the current editing session.
   *
   * @public
   * @readonly
   */
  public get settings() {
    return this._configuration.settings;
  }
  /**
   * Activity of the existing whole-settings writer.
   *
   * @public
   * @readonly
   */
  public get configurationBusy() {
    return this._configuration.configurationBusy;
  }
  /**
   * Measured storage from its existing projection owner.
   *
   * @public
   * @readonly
   */
  public get storageStatus() {
    return this._configuration.storageStatus;
  }
  /**
   * Whether the selected product supplies managed-workspace cleanup.
   *
   * @public
   * @readonly
   */
  public get workspaceCleanupAvailable(): boolean {
    return this._injector.get(WORKSPACE_OPERATIONS, null) !== null;
  }

  // #endregion

  // #region Methods

  /**
   * Saves through the existing validated whole-settings writer.
   *
   * @public
   */
  public saveSettings(
    settings: ApplicationSettingsDto,
    successMessage?: string | false,
  ): Promise<boolean> {
    return this._configuration.saveSettings(settings, successMessage);
  }
  /**
   * Hydrates configuration through its existing owner.
   *
   * @public
   */
  public refreshConfiguration(): Promise<void> {
    return this._configuration.refreshConfiguration();
  }
  /**
   * Refreshes the existing storage measurement.
   *
   * @public
   */
  public refreshStorageStatus(silent = false): Promise<void> {
    return this._configuration.refreshStorageStatus(silent);
  }
  /**
   * Uses the existing repository-readiness policy for an unsaved automation switch.
   *
   * @public
   */
  public unpreparedAutomaticRepositories(enabled?: boolean) {
    return (
      this._injector.get(AUTOMATION_PREPARATION, null)?.unpreparedAutomaticRepositories(enabled) ??
      []
    );
  }
  /**
   * Resolves the included Workspace capability only when cleanup is requested.
   *
   * @public
   */
  public clearWorkspaces(): Promise<boolean> {
    return (
      this._injector.get(WORKSPACE_OPERATIONS, null)?.clearWorkspaces() ?? Promise.resolve(false)
    );
  }

  // #endregion
}
