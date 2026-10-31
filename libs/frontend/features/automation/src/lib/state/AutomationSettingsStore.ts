// #region Imports

import { computed, effect, inject, Injectable, signal } from '@angular/core';
import { MessageBoxService } from '@pixel-brewery/mosaik-elements-angular';
import { defaultAgenticDeliveryPolicy } from '@symphony/domain-automation';
import { Command } from '@symphony/frontend-core';
import { mosaikEventValue, type SettingsHostSession } from '@symphony/frontend-setting';
import type { ApplicationSettingsDto } from '@symphony/ipc-contracts-composition';
import { AUTOMATION_SETTINGS_CONTEXT } from '../ports/AutomationSettingsContextToken';
import { AUTOMATION_PATH_SELECTOR } from '../ports/AutomationPathSelectorToken';

// #endregion

/**
 * Owns one runtime policy draft across every card in a Settings route.
 *
 * @public
 */
@Injectable()
export class AutomationSettingsStore {
  // #region Fields

  private readonly _context = inject(AUTOMATION_SETTINGS_CONTEXT);
  private readonly _client = inject(AUTOMATION_PATH_SELECTOR);
  private readonly _messageBoxService = inject(MessageBoxService);
  private _session: SettingsHostSession | undefined;
  private _settings: ApplicationSettingsDto | undefined;

  /**
   * The runtime.
   *
   * @public
   * @readonly
   */
  public readonly runtime = signal<ApplicationSettingsDto['runtime']>(createDefaultRuntimeDraft());

  /**
   * Readonly managed-root projection consumed by composed settings features.
   *
   * @public
   * @readonly
   */
  public readonly workspaceRoot = computed(() => this.runtime().workspaceRoot);

  /**
   * The automation unprepared repositories.
   *
   * @public
   * @readonly
   */
  public readonly automationUnpreparedRepositories = computed(() => {
    const runtime = this.runtime();
    return this._context.unpreparedAutomaticRepositories(
      runtime.automaticExecutionEnabled || runtime.autonomousExecutionEnabled,
    );
  });

  /**
   * Updates one agentic delivery switch.
   *
   * @public
   * @readonly
   */
  public readonly updateAgenticDeliveryFlag = (
    key:
      | 'enabled'
      | 'observeFailures'
      | 'aiDiagnosisEnabled'
      | 'sourceRepairEnabled'
      | 'workflowRepairEnabled'
      | 'reviewFeedbackEnabled'
      | 'managedBranchUpdatesEnabled'
      | 'conflictSerializationEnabled'
      | 'ciRerunEnabled'
      | 'replacementPullRequestEnabled',
    value: boolean,
  ): void => {
    this.runtime.update((current) => ({
      ...current,
      agenticDelivery: { ...current.agenticDelivery, [key]: value },
    }));
  };

  private readonly _chooseWorkspaceRootCommand: Command<void> = new Command(
    () => void this.onExecuteChooseWorkspaceRootCommand(),
  );

  private readonly _updateRuntimeNumberCommand: Command<
    readonly [
      key:
        | 'managedStorageLimitGiB'
        | 'minimumFreeDiskGiB'
        | 'boardRefreshIntervalMinutes'
        | 'autonomousWorkIntervalMinutes'
        | 'maxParallelExecutions'
        | 'maximumVerificationRepairAttempts',
      event: unknown,
    ]
  > = new Command((parameters) => void this.onExecuteUpdateRuntimeNumberCommand(...parameters));

  private readonly _updateAgenticDeliveryNumberCommand: Command<
    readonly [
      key:
        | 'diagnosisTokenBudget'
        | 'repairTokenBudget'
        | 'dailyTokenBudget'
        | 'maxAttempts'
        | 'maxParallelRepairs'
        | 'cooldownMinutes',
      event: unknown,
    ]
  > = new Command(
    (parameters) => void this.onExecuteUpdateAgenticDeliveryNumberCommand(...parameters),
  );

  private readonly _saveRuntimeCommand: Command<void> = new Command(
    () => void this.onExecuteSaveRuntimeCommand(),
  );

  private readonly _confirmClearWorkspacesCommand: Command<void> = new Command(
    () => void this.onExecuteConfirmClearWorkspacesCommand(),
    computed(() => this._context.workspaceCleanupAvailable),
  );

  // #endregion

  // #region Ctor

  /**
   * Resets this same draft only when authoritative settings change.
   *
   * @public
   */
  public constructor() {
    effect(() => {
      const settings = this._context.settings();
      if (!settings || settings === this._settings) return;
      this._settings = settings;
      this.runtime.set({ ...settings.runtime });
    });
  }

  // #endregion

  // #region Properties

  /**
   * The chooseWorkspaceRoot command.
   *
   * @public
   * @readonly
   */
  public get chooseWorkspaceRootCommand(): Command<void> {
    return this._chooseWorkspaceRootCommand;
  }

  /**
   * The updateRuntimeNumber command.
   *
   * @public
   * @readonly
   */
  public get updateRuntimeNumberCommand(): Command<
    readonly [
      key:
        | 'managedStorageLimitGiB'
        | 'minimumFreeDiskGiB'
        | 'boardRefreshIntervalMinutes'
        | 'autonomousWorkIntervalMinutes'
        | 'maxParallelExecutions'
        | 'maximumVerificationRepairAttempts',
      event: unknown,
    ]
  > {
    return this._updateRuntimeNumberCommand;
  }

  /**
   * The updateAgenticDeliveryNumber command.
   *
   * @public
   * @readonly
   */
  public get updateAgenticDeliveryNumberCommand(): Command<
    readonly [
      key:
        | 'diagnosisTokenBudget'
        | 'repairTokenBudget'
        | 'dailyTokenBudget'
        | 'maxAttempts'
        | 'maxParallelRepairs'
        | 'cooldownMinutes',
      event: unknown,
    ]
  > {
    return this._updateAgenticDeliveryNumberCommand;
  }

  /**
   * The saveRuntime command.
   *
   * @public
   * @readonly
   */
  public get saveRuntimeCommand(): Command<void> {
    return this._saveRuntimeCommand;
  }

  /**
   * The confirmClearWorkspaces command.
   *
   * @public
   * @readonly
   */
  public get confirmClearWorkspacesCommand(): Command<void> {
    return this._confirmClearWorkspacesCommand;
  }

  // #endregion

  // #region Methods

  /**
   * Resets once for a new Settings route while retaining edits across its section switches.
   *
   * @public
   */
  public beginSession(session: SettingsHostSession): void {
    if (session === this._session) return;
    this._session = session;
    this._settings = this._context.settings();
    this.runtime.set(this._settings ? { ...this._settings.runtime } : createDefaultRuntimeDraft());
  }

  /**
   * Chooses the workspace root.
   *
   * @private
   */
  private async onExecuteChooseWorkspaceRootCommand(): Promise<void> {
    const session = this._session;
    const result = await this._client.selectPath({
      kind: 'directory',
      title: 'Choose managed execution root',
      defaultPath: this.runtime().workspaceRoot || undefined,
    });
    if (session !== this._session) return;
    if (!result.canceled && result.paths[0]) {
      this.runtime.update((current) => ({ ...current, workspaceRoot: result.paths[0]! }));
    }
  }

  /**
   * Updates one numeric runtime setting.
   *
   * @param key - Key.
   * @param event - Event.
   * @private
   */
  private onExecuteUpdateRuntimeNumberCommand(
    key:
      | 'managedStorageLimitGiB'
      | 'minimumFreeDiskGiB'
      | 'boardRefreshIntervalMinutes'
      | 'autonomousWorkIntervalMinutes'
      | 'maxParallelExecutions'
      | 'maximumVerificationRepairAttempts',
    event: unknown,
  ): void {
    const value = Number(this.eventValue(event));
    if (!Number.isFinite(value)) return;
    this.runtime.update((current) => ({ ...current, [key]: value }));
  }

  /**
   * Updates the agentic delivery number.
   *
   * @param key - Key.
   * @param event - Event.
   * @private
   */
  private onExecuteUpdateAgenticDeliveryNumberCommand(
    key:
      | 'diagnosisTokenBudget'
      | 'repairTokenBudget'
      | 'dailyTokenBudget'
      | 'maxAttempts'
      | 'maxParallelRepairs'
      | 'cooldownMinutes',
    event: unknown,
  ): void {
    const value = Number(this.eventValue(event));
    if (!Number.isFinite(value)) return;
    this.runtime.update((current) => ({
      ...current,
      agenticDelivery: { ...current.agenticDelivery, [key]: Math.max(0, Math.floor(value)) },
    }));
  }

  /**
   * Saves the runtime.
   *
   * @private
   */
  private async onExecuteSaveRuntimeCommand(): Promise<void> {
    const current = this.requireSettings();
    await this._context.saveSettings({ ...current, runtime: this.runtime() });
  }

  /**
   * Confirms the clear workspaces.
   *
   * @private
   */
  private onExecuteConfirmClearWorkspacesCommand(): void {
    const confirmation = this._messageBoxService.show({
      id: 'clear-workspaces-confirmation',
      header: 'Clear inactive execution workspaces?',
      message:
        'Running executions are preserved. Local uncommitted changes in inactive managed workspaces may be removed.',
      buttons: 'yesNo',
      variant: 'danger',
      pressEscapeToClose: true,
      intl: { yesLabel: 'Clear workspaces', noLabel: 'Keep workspaces' },
    });
    confirmation.closed.subscribe((result) => {
      if (result?.reason === 'positive') void this._context.clearWorkspaces();
    });
  }

  private requireSettings(): ApplicationSettingsDto {
    const settings = this._context.settings();
    if (!settings) throw new Error('Application settings are not loaded.');
    return settings;
  }

  private eventValue(event: unknown): unknown {
    return mosaikEventValue(event);
  }

  // #endregion
}

function createDefaultRuntimeDraft(): ApplicationSettingsDto['runtime'] {
  return {
    workspaceRoot: '',
    managedStorageLimitGiB: 50,
    minimumFreeDiskGiB: 20,
    boardRefreshIntervalMinutes: 15,
    retainFailedWorkspaces: true,
    automaticExecutionEnabled: false,
    autonomousExecutionEnabled: false,
    autonomousWorkIntervalMinutes: 15,
    maxParallelExecutions: 3,
    maximumVerificationRepairAttempts: 2,
    agenticDelivery: { ...defaultAgenticDeliveryPolicy },
  };
}
