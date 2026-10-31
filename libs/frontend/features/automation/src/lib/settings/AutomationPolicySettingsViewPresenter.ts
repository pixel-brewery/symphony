// #region Imports

import { computed, inject, Injectable, signal } from '@angular/core';
import { Command, Hydratable, ViewPresenter } from '@symphony/frontend-core';
import { mosaikEventValue, SettingsHostSession } from '@symphony/frontend-setting';
import { AUTOMATION_SETTINGS_CONTEXT } from '../ports/AutomationSettingsContextToken';
import type { AgenticLevel } from '../state/agentic-ladder/AgenticLevel';
import type { AgenticSwitch } from '../state/agentic-ladder/AgenticSwitch';
import { agenticLevelOf } from '../state/agentic-ladder/agenticLevelOf';
import { agenticSwitchBlocker } from '../state/agentic-ladder/agenticSwitchBlocker';
import { withAgenticLevel } from '../state/agentic-ladder/withAgenticLevel';
import { withAgenticSwitch } from '../state/agentic-ladder/withAgenticSwitch';
import { AutomationSettingsStore } from '../state/AutomationSettingsStore';

// #endregion

type RuntimeFlag =
  'autonomousExecutionEnabled' | 'automaticExecutionEnabled' | 'retainFailedWorkspaces';

type RuntimeNumber =
  | 'boardRefreshIntervalMinutes'
  | 'autonomousWorkIntervalMinutes'
  | 'maxParallelExecutions'
  | 'maximumVerificationRepairAttempts';

type AgenticFlag = 'reviewFeedbackEnabled' | 'conflictSerializationEnabled';

type AgenticNumber =
  | 'diagnosisTokenBudget'
  | 'repairTokenBudget'
  | 'dailyTokenBudget'
  | 'maxAttempts'
  | 'maxParallelRepairs'
  | 'cooldownMinutes';

/** Bounds of every number the section commits, matching the configuration schema. */
const NUMBER_BOUNDS: Readonly<Record<RuntimeNumber | AgenticNumber, readonly [number, number]>> = {
  boardRefreshIntervalMinutes: [1, 1440],
  autonomousWorkIntervalMinutes: [1, 1440],
  maxParallelExecutions: [1, 32],
  maximumVerificationRepairAttempts: [0, 10],
  diagnosisTokenBudget: [1000, 1_000_000],
  repairTokenBudget: [1000, 2_000_000],
  dailyTokenBudget: [1000, 10_000_000],
  maxAttempts: [1, 10],
  maxParallelRepairs: [1, 16],
  cooldownMinutes: [1, 1440],
};

/**
 * Presents the `Automation` section: autonomous work, the `Fix failed checks` ladder with its
 * levels and budgets, review feedback, GitHub commands and execution. Every control applies when
 * it changes; numbers apply when they are committed.
 *
 * @public
 */
@Injectable()
export class AutomationPolicySettingsViewPresenter extends Hydratable(ViewPresenter) {
  // #region Fields

  private readonly _draft = inject(AutomationSettingsStore);
  private readonly _context = inject(AUTOMATION_SETTINGS_CONTEXT);
  private readonly _customLevelChosen = signal(false);

  /**
   * The runtime policy the controls show.
   *
   * @public
   * @readonly
   */
  public readonly runtime = this._draft.runtime;

  /**
   * The level the `Fix failed checks` switches match, or `custom`.
   *
   * @public
   * @readonly
   */
  public readonly agenticLevel = computed<AgenticLevel>(() =>
    this._customLevelChosen() ? 'custom' : agenticLevelOf(this.runtime().agenticDelivery),
  );

  /**
   * Whether a ladder switch is on.
   *
   * @public
   * @readonly
   */
  public readonly agenticSwitchOn = computed(
    () => (key: AgenticSwitch) => this.runtime().agenticDelivery[key],
  );

  /**
   * The prerequisite that keeps a ladder switch from working, if any.
   *
   * @public
   * @readonly
   */
  public readonly agenticBlocker = computed(
    () => (key: AgenticSwitch) => agenticSwitchBlocker(this.runtime().agenticDelivery, key),
  );

  /**
   * How many repositories allow agentic delivery in their own settings, of all repositories.
   *
   * @public
   * @readonly
   */
  public readonly agenticRepositories = computed(() => this.resolveAgenticRepositories());

  /**
   * Native managed-root picker; the chosen folder applies at once.
   *
   * @public
   * @readonly
   */
  public readonly chooseWorkspaceRootCommand = this._draft.chooseWorkspaceRootCommand;

  /**
   * Asks before clearing inactive managed workspaces.
   *
   * @public
   * @readonly
   */
  public readonly confirmClearWorkspacesCommand = this._draft.confirmClearWorkspacesCommand;

  private readonly _selectLevelCommand: Command<AgenticLevel> = new Command(
    (level) => void this.onExecuteSelectLevelCommand(level),
  );

  private readonly _setAgenticSwitchCommand: Command<
    readonly [key: AgenticSwitch, value: boolean]
  > = new Command((parameters) => void this.onExecuteSetAgenticSwitchCommand(...parameters));

  private readonly _setAgenticFlagCommand: Command<readonly [key: AgenticFlag, value: boolean]> =
    new Command((parameters) => void this.onExecuteSetAgenticFlagCommand(...parameters));

  private readonly _setRuntimeFlagCommand: Command<readonly [key: RuntimeFlag, value: boolean]> =
    new Command((parameters) => void this.onExecuteSetRuntimeFlagCommand(...parameters));

  private readonly _commitRuntimeNumberCommand: Command<
    readonly [key: RuntimeNumber, event: unknown]
  > = new Command((parameters) => void this.onExecuteCommitRuntimeNumberCommand(...parameters));

  private readonly _commitAgenticNumberCommand: Command<
    readonly [key: AgenticNumber, event: unknown]
  > = new Command((parameters) => void this.onExecuteCommitAgenticNumberCommand(...parameters));

  // #endregion

  // #region Ctor

  /**
   * Joins the existing Settings route rather than creating another runtime policy.
   *
   * @public
   */
  public constructor() {
    super();
    this._draft.beginSession(inject(SettingsHostSession));
  }

  // #endregion

  // #region Properties

  /**
   * Whether this product includes the existing Workspace cleanup owner.
   *
   * @public
   * @readonly
   */
  public get workspaceCleanupAvailable(): boolean {
    return this._context.workspaceCleanupAvailable;
  }

  /**
   * Chooses a `Fix failed checks` level and sets its switches in one go.
   *
   * @public
   * @readonly
   */
  public get selectLevelCommand(): Command<AgenticLevel> {
    return this._selectLevelCommand;
  }

  /**
   * Turns one ladder switch on or off; the level then reads `Custom` unless it matches a level.
   *
   * @public
   * @readonly
   */
  public get setAgenticSwitchCommand(): Command<readonly [key: AgenticSwitch, value: boolean]> {
    return this._setAgenticSwitchCommand;
  }

  /**
   * Turns review feedback or delivery serialization on or off.
   *
   * @public
   * @readonly
   */
  public get setAgenticFlagCommand(): Command<readonly [key: AgenticFlag, value: boolean]> {
    return this._setAgenticFlagCommand;
  }

  /**
   * Turns autonomous work, GitHub commands or failed-workspace retention on or off.
   *
   * @public
   * @readonly
   */
  public get setRuntimeFlagCommand(): Command<readonly [key: RuntimeFlag, value: boolean]> {
    return this._setRuntimeFlagCommand;
  }

  /**
   * Applies a committed runtime number within its bounds.
   *
   * @public
   * @readonly
   */
  public get commitRuntimeNumberCommand(): Command<readonly [key: RuntimeNumber, event: unknown]> {
    return this._commitRuntimeNumberCommand;
  }

  /**
   * Applies a committed budget within its bounds.
   *
   * @public
   * @readonly
   */
  public get commitAgenticNumberCommand(): Command<readonly [key: AgenticNumber, event: unknown]> {
    return this._commitAgenticNumberCommand;
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

  /**
   * Applies a level.
   *
   * @param level - The chosen level.
   * @private
   */
  private async onExecuteSelectLevelCommand(level: AgenticLevel): Promise<void> {
    this._customLevelChosen.set(level === 'custom');
    if (level === 'custom' || level === agenticLevelOf(this.runtime().agenticDelivery)) return;
    await this._draft.applyAgenticDelivery((policy) => withAgenticLevel(policy, level));
  }

  /**
   * Applies one ladder switch.
   *
   * @param key - The switch.
   * @param value - Whether it is on.
   * @private
   */
  private async onExecuteSetAgenticSwitchCommand(
    key: AgenticSwitch,
    value: boolean,
  ): Promise<void> {
    if (this.runtime().agenticDelivery[key] === value) return;
    this._customLevelChosen.set(false);
    await this._draft.applyAgenticDelivery((policy) => withAgenticSwitch(policy, key, value));
  }

  /**
   * Applies a switch outside the ladder.
   *
   * @param key - The switch.
   * @param value - Whether it is on.
   * @private
   */
  private async onExecuteSetAgenticFlagCommand(key: AgenticFlag, value: boolean): Promise<void> {
    if (this.runtime().agenticDelivery[key] === value) return;
    await this._draft.applyAgenticDelivery((policy) => ({ ...policy, [key]: value }));
  }

  /**
   * Applies a runtime switch.
   *
   * @param key - The switch.
   * @param value - Whether it is on.
   * @private
   */
  private async onExecuteSetRuntimeFlagCommand(key: RuntimeFlag, value: boolean): Promise<void> {
    if (this.runtime()[key] === value) return;
    await this._draft.applyRuntime({ [key]: value });
  }

  /**
   * Applies a committed runtime number.
   *
   * @param key - The setting.
   * @param event - The number box change.
   * @private
   */
  private async onExecuteCommitRuntimeNumberCommand(
    key: RuntimeNumber,
    event: unknown,
  ): Promise<void> {
    const value = this.boundedNumber(key, event);
    if (value === undefined || value === this.runtime()[key]) return;
    await this._draft.applyRuntime({ [key]: value });
  }

  /**
   * Applies a committed budget.
   *
   * @param key - The budget.
   * @param event - The number box change.
   * @private
   */
  private async onExecuteCommitAgenticNumberCommand(
    key: AgenticNumber,
    event: unknown,
  ): Promise<void> {
    const value = this.boundedNumber(key, event);
    if (value === undefined || value === this.runtime().agenticDelivery[key]) return;
    await this._draft.applyAgenticDelivery((policy) => ({ ...policy, [key]: value }));
  }

  /**
   * Returns the repositories that allow agentic delivery.
   *
   * @private
   */
  private resolveAgenticRepositories(): { readonly allowed: number; readonly total: number } {
    const settings = this._context.settings();
    if (!settings) return { allowed: 0, total: 0 };
    const allowed = new Set(
      settings.ciBindings
        .filter((binding) => binding.enabled && binding.agenticDeliveryEnabled)
        .map((binding) => binding.repositoryBindingId),
    );
    return {
      allowed: settings.repositoryBindings.filter((binding) => allowed.has(binding.id)).length,
      total: settings.repositoryBindings.length,
    };
  }

  /**
   * Reads a committed number, rounded down and kept within its bounds.
   *
   * @param key - The setting.
   * @param event - The number box change.
   * @private
   */
  private boundedNumber(key: RuntimeNumber | AgenticNumber, event: unknown): number | undefined {
    const raw = mosaikEventValue(event);
    if (raw === '' || raw === null || raw === undefined) return undefined;
    const value = Number(raw);
    if (!Number.isFinite(value)) return undefined;
    const [minimum, maximum] = NUMBER_BOUNDS[key];
    return Math.min(maximum, Math.max(minimum, Math.floor(value)));
  }

  // #endregion
}
