// #region Imports

import { computed, effect, inject, Injectable, Injector, signal } from '@angular/core';
import {
  defaultAgenticDeliveryPolicy,
  type IAgenticDeliveryPolicy,
} from '@symphony/domain-automation';
import { Command } from '@symphony/frontend-core';
import {
  mosaikEventValue,
  SettingsAlertService,
  type SettingsHostSession,
} from '@symphony/frontend-setting';
import type { ApplicationSettingsDto } from '@symphony/ipc-contracts-composition';
import { AUTOMATION_SETTINGS_CONTEXT } from '../ports/AutomationSettingsContextToken';
import { AUTOMATION_PATH_SELECTOR } from '../ports/AutomationPathSelectorToken';

// #endregion

/**
 * Owns the runtime policy shown across every card in a Settings route. The Automation section
 * applies each change at once through `applyRuntime` / `applyAgenticDelivery`: the control shows
 * the new value immediately, saves it, and returns to the stored value when saving fails. Saves are
 * queued so quick successive changes build on each other.
 *
 * @public
 */
@Injectable()
export class AutomationSettingsStore {
  // #region Fields

  private readonly _context = inject(AUTOMATION_SETTINGS_CONTEXT);
  private readonly _client = inject(AUTOMATION_PATH_SELECTOR);
  private readonly _injector = inject(Injector);
  private _session: SettingsHostSession | undefined;
  private _settings: ApplicationSettingsDto | undefined;
  private _saveQueue: Promise<unknown> = Promise.resolve();
  private readonly _pendingSaves = signal(0);

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
      // While changes are still being saved, the controls keep showing them; the stored values
      // take over once the queue is empty.
      if (!settings || settings === this._settings || this._pendingSaves() > 0) return;
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
   * Applies runtime values at once and saves them; restores the stored values when saving fails.
   *
   * @param patch - The changed runtime values.
   * @returns Whether the values were saved.
   * @public
   */
  public applyRuntime(
    patch: Partial<Omit<ApplicationSettingsDto['runtime'], 'agenticDelivery'>>,
  ): Promise<boolean> {
    this.runtime.update((current) => ({ ...current, ...patch }));
    return this.enqueueSave(
      (runtime) => ({ ...runtime, ...patch }),
      (current, stored) => ({
        ...current,
        ...Object.fromEntries(
          Object.keys(patch).map((key) => [key, stored[key as keyof typeof stored]]),
        ),
      }),
    );
  }

  /**
   * Applies a change of the agentic-delivery policy at once and saves it; restores the stored
   * policy when saving fails.
   *
   * @param update - Derives the changed policy from a policy.
   * @returns Whether the policy was saved.
   * @public
   */
  public applyAgenticDelivery(
    update: (policy: IAgenticDeliveryPolicy) => IAgenticDeliveryPolicy,
  ): Promise<boolean> {
    this.runtime.update((current) => ({
      ...current,
      agenticDelivery: update(current.agenticDelivery),
    }));
    return this.enqueueSave(
      (runtime) => ({ ...runtime, agenticDelivery: update(runtime.agenticDelivery) }),
      (current, stored) => ({ ...current, agenticDelivery: { ...stored.agenticDelivery } }),
    );
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
    const workspaceRoot = result.paths[0];
    if (!result.canceled && workspaceRoot) await this.applyRuntime({ workspaceRoot });
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
  private async onExecuteConfirmClearWorkspacesCommand(): Promise<void> {
    // The alert sheet service is resolved when it is needed, so cards that never ask stay
    // independent of the window's dialog service.
    const confirmed = await this._injector.get(SettingsAlertService).confirm({
      id: 'clear-workspaces-confirmation',
      header: 'Clear inactive execution workspaces?',
      message:
        'Running executions are preserved. Local uncommitted changes in inactive managed workspaces may be removed.',
      confirmLabel: 'Clear workspaces',
      cancelLabel: 'Keep workspaces',
      destructive: true,
    });
    if (confirmed) await this._context.clearWorkspaces();
  }

  /**
   * Saves one change after the changes before it, on the latest stored settings.
   *
   * @param change - Applies the change to the stored runtime policy.
   * @param restore - Puts the stored values back into the shown policy after a failed save.
   * @private
   */
  private enqueueSave(
    change: (runtime: ApplicationSettingsDto['runtime']) => ApplicationSettingsDto['runtime'],
    restore: (
      current: ApplicationSettingsDto['runtime'],
      stored: ApplicationSettingsDto['runtime'],
    ) => ApplicationSettingsDto['runtime'],
  ): Promise<boolean> {
    this._pendingSaves.update((count) => count + 1);
    const save = this._saveQueue.then(async () => {
      const settings = this._context.settings();
      if (!settings) return false;
      try {
        const saved = await this._context.saveSettings({
          ...settings,
          runtime: change(settings.runtime),
        });
        if (!saved) this.runtime.update((current) => restore(current, settings.runtime));
        return saved;
      } catch {
        this.runtime.update((current) => restore(current, settings.runtime));
        return false;
      }
    });
    this._saveQueue = save.finally(() => this._pendingSaves.update((count) => count - 1));
    return save;
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
