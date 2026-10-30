// #region Imports

import { inject, Injectable } from '@angular/core';
import { Hydratable, ViewPresenter } from '@symphony/frontend-core';
import { SettingsHostSession } from '@symphony/frontend-setting';
import { AUTOMATION_SETTINGS_CONTEXT } from '../ports/AutomationSettingsContextToken';
import { AutomationSettingsStore } from '../state/AutomationSettingsStore';

// #endregion

/**
 * Presents Automation's runtime policy through the route's single draft.
 *
 * @public
 */
@Injectable()
export class AutomationPolicySettingsViewPresenter extends Hydratable(ViewPresenter) {
  // #region Fields

  private readonly _draft = inject(AutomationSettingsStore);
  private readonly _context = inject(AUTOMATION_SETTINGS_CONTEXT);
  /**
   * Shared editable runtime policy.
   *
   * @public
   * @readonly
   */
  public readonly runtime = this._draft.runtime;
  /**
   * Existing readiness warning for the unsaved automation switches.
   *
   * @public
   * @readonly
   */
  public readonly automationUnpreparedRepositories = this._draft.automationUnpreparedRepositories;
  /**
   * Native managed-root picker.
   *
   * @public
   * @readonly
   */
  public readonly chooseWorkspaceRootCommand = this._draft.chooseWorkspaceRootCommand;
  /**
   * Shared numeric policy update.
   *
   * @public
   * @readonly
   */
  public readonly updateRuntimeNumberCommand = this._draft.updateRuntimeNumberCommand;
  /**
   * Shared agentic delivery numeric update.
   *
   * @public
   * @readonly
   */
  public readonly updateAgenticDeliveryNumberCommand =
    this._draft.updateAgenticDeliveryNumberCommand;
  /**
   * Shared agentic delivery flag update.
   *
   * @public
   * @readonly
   */
  public readonly updateAgenticDeliveryFlag = this._draft.updateAgenticDeliveryFlag;
  /**
   * Existing confirmed inactive-workspace cleanup.
   *
   * @public
   * @readonly
   */
  public readonly confirmClearWorkspacesCommand = this._draft.confirmClearWorkspacesCommand;
  /**
   * Saves through the single settings writer.
   *
   * @public
   * @readonly
   */
  public readonly saveRuntimeCommand = this._draft.saveRuntimeCommand;

  // #endregion

  // #region Ctor

  /**
   * Joins the existing Settings route rather than creating another runtime draft.
   *
   * @public
   */
  public constructor() {
    super();
    this._draft.beginSession(inject(SettingsHostSession));
  }

  // #endregion

  // #region Properties

  /** Whether this product includes the existing Workspace cleanup owner. @public @readonly */
  public get workspaceCleanupAvailable(): boolean {
    return this._context.workspaceCleanupAvailable;
  }

  // #endregion

  // #region Methods

  /**
   * Hydrates only when authoritative settings have not loaded.
   *
   * @public
   */
  public override onHydrate(): Promise<void> | undefined {
    return this._context.settings() ? undefined : this._context.refreshConfiguration();
  }

  // #endregion
}
