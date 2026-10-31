// #region Imports

import { computed, DestroyRef, effect, inject, Injectable, signal } from '@angular/core';
import { projectAgentActivity, type IExecutionRecord } from '@symphony/domain-execution';
import {
  browserStorage,
  Command,
  continuousIntegrationRefreshDelay,
  INBOX_SUMMARY,
  ORCHESTRATION_CLIENT,
} from '@symphony/frontend-core';
import { AUTOMATION_PREPARATION } from '@symphony/frontend-core/automation';
import { CI_OPERATIONS } from '@symphony/frontend-core/ci';
import { ConfigurationStore } from '@symphony/frontend-core/configuration';
import { DESKTOP_CLIENT } from '@symphony/frontend-core/desktop';
import type { ResponsePayload } from '@symphony/ipc-contracts-composition';
import {
  buildRailRuns,
  type IRailRun,
  resolveMenuBarStatus,
} from '@symphony/frontend-feature-execution/projections';
import { ExecutionControls } from '@symphony/frontend-feature-execution';
import { NotificationCentre } from '@symphony/frontend-notification';
import { DesktopUpdateStore } from '@symphony/frontend-update';
import type { IMenuBarAgentRow } from './IMenuBarAgentRow';

// #endregion

type ExecutionState = ResponsePayload<'execution-state.get'>;
type AutonomyStatus = ResponsePayload<'autonomy.status.get'>;
type ContinuousIntegrationState = ResponsePayload<'ci.runs.refresh'>;
type RunView = 'agents' | 'actions';
type WindowRoute = 'current' | 'settings' | 'actions' | 'inbox' | 'notifications' | 'new-work-item';

const RUN_VIEW_STORAGE_KEY = 'presentation.menuBarRunView';
const MAXIMUM_ACTION_ROWS = 4;
const AGENT_STATE_ORDER: readonly IMenuBarAgentRow['state'][] = [
  'needs-input',
  'working',
  'paused',
  'blocked',
  'queued',
  'failed',
  'completed',
];

/**
 * Owns the menu-bar panel (the tray): live agent and action runs, execution slots, what needs
 * the user, autonomous work, the update and the application commands. The panel is a window of
 * its own that does not hydrate the application, so it reads its state directly.
 *
 * @public
 */
@Injectable()
export class MenuBarViewPresenter {
  // #region Fields

  private readonly _client = inject(ORCHESTRATION_CLIENT);
  private readonly _desktop = inject(DESKTOP_CLIENT);
  private readonly _configuration = inject(ConfigurationStore);
  private readonly _executions = inject(ExecutionControls, { optional: true });
  private readonly _destroyRef = inject(DestroyRef);

  /** Whether this product contributes isolated execution controls. @public @readonly */
  public readonly executionAvailable = this._executions !== null;
  /** Whether this product includes Actions. @public @readonly */
  public readonly ciAvailable = inject(CI_OPERATIONS, { optional: true }) !== null;
  /** Whether this product includes autonomous work. @public @readonly */
  public readonly autonomyAvailable = inject(AUTOMATION_PREPARATION, { optional: true }) !== null;

  /**
   * Desktop update state shared with the status bar and Settings.
   *
   * @public
   * @readonly
   */
  public readonly updates = inject(DesktopUpdateStore);

  /**
   * What needs attention, gathered from the feature sources.
   *
   * @public
   * @readonly
   */
  public readonly notifications = inject(NotificationCentre);

  /**
   * What waits in the Inbox, when the product includes it.
   *
   * @public
   * @readonly
   */
  public readonly inbox = inject(INBOX_SUMMARY, { optional: true });

  /**
   * Validated settings of the running application.
   *
   * @public
   * @readonly
   */
  public readonly settings = this._configuration.settings;

  private readonly _executionState = signal<ExecutionState>({
    executions: [],
    executionQueue: [],
    events: [],
    goals: [],
  });
  private readonly _continuousIntegration = signal<ContinuousIntegrationState>({
    ciWorkflows: [],
    ciRuns: [],
    localCiExecutions: [],
    remoteData: { state: 'unavailable' },
  });

  /**
   * Autonomous work and execution capacity.
   *
   * @public
   * @readonly
   */
  public readonly autonomy = signal<AutonomyStatus | undefined>(undefined);

  /**
   * Current time, for the next-cycle countdown and run durations.
   *
   * @public
   * @readonly
   */
  public readonly now = signal(Date.now());

  /**
   * Whether the first load is still running.
   *
   * @public
   * @readonly
   */
  public readonly loading = signal(true);

  /**
   * The last failure of a panel command or load.
   *
   * @public
   * @readonly
   */
  public readonly error = signal<string | undefined>(undefined);

  /**
   * Why Actions could not be refreshed, while they cannot.
   *
   * @public
   * @readonly
   */
  public readonly actionsError = signal<string | undefined>(undefined);

  /**
   * Whether the autonomy switch is being applied.
   *
   * @public
   * @readonly
   */
  public readonly autonomyBusy = signal(false);

  /**
   * The execution being paused or resumed.
   *
   * @public
   * @readonly
   */
  public readonly executionBusy = signal<string | undefined>(undefined);

  /**
   * The selected `Agents | Actions` segment.
   *
   * @public
   * @readonly
   */
  public readonly selectedRunView = signal<RunView>(
    readStoredRunView() ?? (this.executionAvailable ? 'agents' : 'actions'),
  );

  private _refreshInFlight?: Promise<void>;
  private _continuousIntegrationRefreshInFlight?: Promise<void>;
  private _continuousIntegrationRefreshTimer?: number;

  /**
   * Execution capacity: one slot per parallel step.
   *
   * @public
   * @readonly
   */
  public readonly capacity = computed(
    () => this.autonomy() ?? { enabled: false, maximum: 1, active: 0, available: 1 },
  );

  /**
   * Steps that were accepted and take the next free slots before anything else.
   *
   * @public
   * @readonly
   */
  public readonly queuedSteps = computed(() => this._executionState().executionQueue);

  /**
   * The provider-neutral run timeline shared with the sidebar's run panel.
   *
   * @public
   * @readonly
   */
  public readonly railRuns = computed(() => {
    const state = this._executionState();
    const continuousIntegration = this._continuousIntegration();
    const settings = this.settings();
    return buildRailRuns({
      executions: state.executions,
      executionQueue: state.executionQueue,
      events: state.events,
      workItems: [],
      ciRuns: continuousIntegration.ciRuns,
      localCiExecutions: continuousIntegration.localCiExecutions,
      repositoryNames: Object.fromEntries(
        settings?.repositoryBindings.map((repository) => [repository.id, repository.displayName]) ??
          [],
      ),
      ...(continuousIntegration.activeLocalCiRun
        ? { activeLocalCiRun: continuousIntegration.activeLocalCiRun }
        : {}),
    });
  });

  /**
   * The active workspace.
   *
   * @public
   * @readonly
   */
  public readonly activeWorkspace = computed(() => {
    const settings = this.settings();
    return settings?.workspaces.find(
      (workspace) => workspace.id === settings.activeViewScope.workspaceIds[0],
    );
  });

  /**
   * Agents of the active workspace with live work or a result from today, active work first.
   *
   * @public
   * @readonly
   */
  public readonly agentRows = computed<readonly IMenuBarAgentRow[]>(() => {
    const settings = this.settings();
    const workspaceId = this.activeWorkspace()?.id;
    if (!settings || !workspaceId || !this.executionAvailable) return [];
    const state = this._executionState();
    const profiles = settings.agentProfiles.filter(
      (profile) => profile.workspaceId === workspaceId && profile.enabled,
    );
    const activities = projectAgentActivity(profiles, state, true);
    const executions = new Map(state.executions.map((execution) => [execution.id, execution]));
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const today = startOfToday.toISOString();
    return profiles
      .flatMap((profile): IMenuBarAgentRow[] => {
        const activity = activities.find((entry) => entry.agentId === profile.id);
        const work = activity?.work[0];
        const rowState = activity?.state;
        if (!work || !rowState || rowState === 'idle' || rowState === 'stale') return [];
        const finished = rowState === 'completed' || rowState === 'failed';
        if (finished && (work.updatedAt ?? '') < today) return [];
        const execution = work.executionId ? executions.get(work.executionId) : undefined;
        const queued = state.executionQueue.find((entry) => entry.workItemId === work.workItemId);
        const workItemKey = execution?.workItemSnapshot?.externalId ?? queued?.workItemExternalId;
        const workItemTitle = execution?.workItemSnapshot?.title ?? queued?.workItemTitle;
        return [
          {
            id: profile.id,
            name: profile.displayName,
            appearance: profile.appearance,
            state: rowState,
            role: work.role,
            ...(workItemKey ? { workItemKey } : {}),
            ...(workItemTitle ? { workItemTitle } : {}),
            ...(work.executionId ? { executionId: work.executionId } : {}),
            ...(work.updatedAt ? { updatedAt: work.updatedAt } : {}),
          },
        ];
      })
      .sort(
        (left, right) =>
          AGENT_STATE_ORDER.indexOf(left.state) - AGENT_STATE_ORDER.indexOf(right.state),
      );
  });

  /**
   * Number of agents with live work, shown on the `Agents` segment.
   *
   * @public
   * @readonly
   */
  public readonly activeAgentCount = computed(
    () =>
      this.agentRows().filter((agent) => agent.state !== 'completed' && agent.state !== 'failed')
        .length,
  );

  /**
   * Action runs: every running and queued run, then the latest finished ones, at most four.
   *
   * @public
   * @readonly
   */
  public readonly actionRows = computed(() => {
    const actions = this.railRuns().filter((run) => run.kind !== 'agent');
    const current = actions.filter((run) => run.active || run.state === 'queued');
    const finished = actions.filter((run) => !run.active && run.state !== 'queued');
    return [...current, ...finished].slice(0, Math.max(MAXIMUM_ACTION_ROWS, current.length));
  });

  /**
   * Number of running and queued action runs, shown on the `Actions` segment.
   *
   * @public
   * @readonly
   */
  public readonly activeActionRunCount = computed(
    () => this.actionRows().filter((run) => run.active || run.state === 'queued').length,
  );

  /**
   * Number of agent and action runs in progress, for the header's status line.
   *
   * @public
   * @readonly
   */
  public readonly runningCount = computed(() => this.railRuns().filter((run) => run.active).length);

  /**
   * The semantic state projected onto the native menu-bar mark.
   *
   * @public
   * @readonly
   */
  public readonly menuBarStatus = computed(() => resolveMenuBarStatus(this.railRuns()));

  /**
   * Execution ids that can be paused.
   *
   * @public
   * @readonly
   */
  public readonly pausableExecutionIds = computed(
    () =>
      new Set(
        this._executionState()
          .executions.filter(
            (execution) => this.isExecutionActive(execution) && execution.pause === undefined,
          )
          .map((execution) => execution.id),
      ),
  );

  /**
   * Execution ids that can be resumed.
   *
   * @public
   * @readonly
   */
  public readonly resumableExecutionIds = computed(
    () =>
      new Set(
        this._executionState()
          .executions.filter(
            (execution) =>
              this.isExecutionActive(execution) &&
              execution.pause !== undefined &&
              execution.pause.resumeRequestedAt === undefined,
          )
          .map((execution) => execution.id),
      ),
  );

  private readonly _enableAutonomyCommand: Command<void> = new Command(
    () => void this.onExecuteSetAutonomyEnabledCommand(true),
    computed(() => this.autonomyAvailable && !this.autonomyBusy()),
  );
  private readonly _disableAutonomyCommand: Command<void> = new Command(
    () => void this.onExecuteSetAutonomyEnabledCommand(false),
    computed(() => this.autonomyAvailable && !this.autonomyBusy()),
  );
  private readonly _pauseExecutionCommand: Command<string> = new Command(
    (executionId) => void this.onExecutePauseExecutionCommand(executionId),
    computed(() => this.executionAvailable && this.executionBusy() === undefined),
  );
  private readonly _resumeExecutionCommand: Command<string> = new Command(
    (executionId) => void this.onExecuteResumeExecutionCommand(executionId),
    computed(() => this.executionAvailable && this.executionBusy() === undefined),
  );
  private readonly _selectRunViewCommand: Command<RunView> = new Command((view) => {
    this.selectedRunView.set(view);
    browserStorage()?.setItem(RUN_VIEW_STORAGE_KEY, view);
  });
  private readonly _openSymphonyCommand: Command<void> = new Command(
    () => void this.showWindow('current'),
  );
  private readonly _openSettingsCommand: Command<void> = new Command(
    () => void this.showWindow('settings'),
  );
  private readonly _openRunCommand: Command<IRailRun> = new Command(
    (run) => void this.showWindow(run.kind === 'agent' ? 'current' : 'actions'),
  );
  private readonly _openAllRunsCommand: Command<void> = new Command(
    () => void this.showWindow('actions'),
  );
  private readonly _openInboxCommand: Command<void> = new Command(
    () => void this.showWindow('inbox'),
  );
  private readonly _openNotificationsCommand: Command<void> = new Command(
    () => void this.showWindow('notifications'),
  );
  private readonly _newWorkItemCommand: Command<void> = new Command(
    () => void this.showWindow('new-work-item'),
  );
  private readonly _updateSymphonyCommand: Command<void> = new Command(
    () => void this.onExecuteUpdateSymphonyCommand(),
    computed(() => !this.updates.busy() && this.updates.state()?.kind !== 'disabled'),
  );
  private readonly _quitSymphonyCommand: Command<void> = new Command(
    () => void this.onExecuteQuitSymphonyCommand(),
  );

  // #endregion

  // #region Ctor

  public constructor() {
    document.title = 'Symphony Menu Bar';
    const clock = window.setInterval(() => this.now.set(Date.now()), 1_000);
    const unsubscribe =
      this.executionAvailable || this.autonomyAvailable
        ? this._client.onExecutionEvent(() => void this.refreshRuntimeState())
        : undefined;
    effect(() => {
      const status = this.menuBarStatus();
      void this._desktop.request('menu-bar.status.set', { status }).catch(() => undefined);
    });
    const handleVisibility = (): void => {
      if (document.visibilityState === 'visible') void this.refresh();
    };
    document.addEventListener('visibilitychange', handleVisibility);
    this._destroyRef.onDestroy(() => {
      window.clearInterval(clock);
      if (this._continuousIntegrationRefreshTimer !== undefined) {
        window.clearTimeout(this._continuousIntegrationRefreshTimer);
      }
      unsubscribe?.();
      document.removeEventListener('visibilitychange', handleVisibility);
    });
  }

  // #endregion

  // #region Properties

  /**
   * Turns autonomous work on.
   *
   * @public
   * @readonly
   */
  public get enableAutonomyCommand(): Command<void> {
    return this._enableAutonomyCommand;
  }

  /**
   * Turns autonomous work off.
   *
   * @public
   * @readonly
   */
  public get disableAutonomyCommand(): Command<void> {
    return this._disableAutonomyCommand;
  }

  /**
   * Pauses the execution an agent row identifies.
   *
   * @public
   * @readonly
   */
  public get pauseExecutionCommand(): Command<string> {
    return this._pauseExecutionCommand;
  }

  /**
   * Resumes the execution an agent row identifies.
   *
   * @public
   * @readonly
   */
  public get resumeExecutionCommand(): Command<string> {
    return this._resumeExecutionCommand;
  }

  /**
   * Switches between `Agents` and `Actions`.
   *
   * @public
   * @readonly
   */
  public get selectRunViewCommand(): Command<RunView> {
    return this._selectRunViewCommand;
  }

  /**
   * Brings the Symphony window forward.
   *
   * @public
   * @readonly
   */
  public get openSymphonyCommand(): Command<void> {
    return this._openSymphonyCommand;
  }

  /**
   * Opens the Settings window.
   *
   * @public
   * @readonly
   */
  public get openSettingsCommand(): Command<void> {
    return this._openSettingsCommand;
  }

  /**
   * Opens the Symphony surface that owns a run.
   *
   * @public
   * @readonly
   */
  public get openRunCommand(): Command<IRailRun> {
    return this._openRunCommand;
  }

  /**
   * Opens `Actions` on all runs.
   *
   * @public
   * @readonly
   */
  public get openAllRunsCommand(): Command<void> {
    return this._openAllRunsCommand;
  }

  /**
   * Opens the Inbox in the main window.
   *
   * @public
   * @readonly
   */
  public get openInboxCommand(): Command<void> {
    return this._openInboxCommand;
  }

  /**
   * Opens the main window with the notification centre open.
   *
   * @public
   * @readonly
   */
  public get openNotificationsCommand(): Command<void> {
    return this._openNotificationsCommand;
  }

  /**
   * Opens the main window on the new-work-item sheet.
   *
   * @public
   * @readonly
   */
  public get newWorkItemCommand(): Command<void> {
    return this._newWorkItemCommand;
  }

  /**
   * Installs a ready update, downloads an available one, otherwise checks for one.
   *
   * @public
   * @readonly
   */
  public get updateSymphonyCommand(): Command<void> {
    return this._updateSymphonyCommand;
  }

  /**
   * Quits Symphony.
   *
   * @public
   * @readonly
   */
  public get quitSymphonyCommand(): Command<void> {
    return this._quitSymphonyCommand;
  }

  // #endregion

  // #region Methods

  /**
   * Loads the panel's state.
   *
   * @public
   */
  public initialize(): Promise<void> {
    return this.refresh();
  }

  private refresh(): Promise<void> {
    this._refreshInFlight ??= this.refreshOnce().finally(() => {
      this._refreshInFlight = undefined;
    });
    return this._refreshInFlight;
  }

  private async onExecuteSetAutonomyEnabledCommand(enabled: boolean): Promise<void> {
    if (!this.autonomyAvailable || this.autonomyBusy()) return;
    this.autonomyBusy.set(true);
    this.error.set(undefined);
    try {
      this.autonomy.set(await this._client.request('autonomy.set-enabled', { enabled }));
    } catch (cause) {
      this.error.set(
        cause instanceof Error ? cause.message : 'Autonomous work could not be changed.',
      );
    } finally {
      this.autonomyBusy.set(false);
    }
  }

  private async onExecutePauseExecutionCommand(executionId: string): Promise<void> {
    await this.runExecutionCommand(executionId, 'execution.pause');
  }

  private async onExecuteResumeExecutionCommand(executionId: string): Promise<void> {
    await this.runExecutionCommand(executionId, 'execution.resume');
  }

  private async showWindow(route: WindowRoute): Promise<void> {
    await this._desktop.request('window.show', { route });
  }

  private async onExecuteUpdateSymphonyCommand(): Promise<void> {
    if (this.updates.state()?.kind === 'ready') await this.updates.install();
    else if (this.updates.state()?.kind === 'available') await this.updates.download();
    else await this.updates.check();
  }

  private async onExecuteQuitSymphonyCommand(): Promise<void> {
    await this._desktop.request('app.quit', {});
  }

  private async refreshOnce(): Promise<void> {
    this.error.set(undefined);
    try {
      const [, executionState, autonomy] = await Promise.all([
        this._configuration.refreshSettings(),
        this.executionAvailable ? this._client.request('execution-state.get', {}) : undefined,
        this.autonomyAvailable ? this._client.request('autonomy.status.get', {}) : undefined,
      ]);
      if (executionState) this._executionState.set(executionState);
      if (autonomy) this.autonomy.set(autonomy);
      await Promise.all([
        this.refreshContinuousIntegrationState(),
        this.notifications.refresh(),
        this.inbox?.refresh().catch(() => undefined),
      ]);
    } catch (cause) {
      this.error.set(
        cause instanceof Error ? cause.message : 'Symphony could not refresh the menu bar panel.',
      );
    } finally {
      this.loading.set(false);
    }
  }

  private async refreshRuntimeState(): Promise<void> {
    const [executionState, autonomy] = await Promise.all([
      this.executionAvailable ? this._client.request('execution-state.get', {}) : undefined,
      this.autonomyAvailable ? this._client.request('autonomy.status.get', {}) : undefined,
    ]);
    if (executionState) this._executionState.set(executionState);
    if (autonomy) this.autonomy.set(autonomy);
  }

  private refreshContinuousIntegrationState(): Promise<void> {
    if (!this.ciAvailable) return Promise.resolve();
    this._continuousIntegrationRefreshInFlight ??=
      this.refreshContinuousIntegrationStateOnce().finally(() => {
        this._continuousIntegrationRefreshInFlight = undefined;
      });
    return this._continuousIntegrationRefreshInFlight;
  }

  private async refreshContinuousIntegrationStateOnce(): Promise<void> {
    let refreshed = false;
    try {
      this._continuousIntegration.set(await this._client.request('ci.runs.refresh', {}));
      this.actionsError.set(undefined);
      refreshed = true;
    } catch (cause) {
      this.actionsError.set(
        cause instanceof Error ? cause.message : 'Actions could not be refreshed.',
      );
    } finally {
      if (refreshed) this.scheduleContinuousIntegrationRefresh();
    }
  }

  private scheduleContinuousIntegrationRefresh(): void {
    if (this._continuousIntegrationRefreshTimer !== undefined) {
      window.clearTimeout(this._continuousIntegrationRefreshTimer);
      this._continuousIntegrationRefreshTimer = undefined;
    }
    if (!this.ciAvailable || !this.settings()?.ciBindings.some((binding) => binding.enabled))
      return;
    const state = this._continuousIntegration();
    const activeDelay = continuousIntegrationRefreshDelay(
      state.activeLocalCiRun !== undefined,
      state.ciRuns,
      state.remoteData.state,
    );
    const delay = activeDelay ?? (state.remoteData.state === 'current' ? 60_000 : undefined);
    if (delay === undefined) return;
    this._continuousIntegrationRefreshTimer = window.setTimeout(() => {
      this._continuousIntegrationRefreshTimer = undefined;
      void this.refreshContinuousIntegrationState();
    }, delay);
  }

  private async runExecutionCommand(
    executionId: string,
    method: 'execution.pause' | 'execution.resume',
  ): Promise<void> {
    if (!this._executions || this.executionBusy()) return;
    this.executionBusy.set(executionId);
    this.error.set(undefined);
    try {
      if (method === 'execution.pause') await this._executions.pauseExecution(executionId);
      else await this._executions.resumeExecution(executionId);
      await this.refreshRuntimeState();
    } catch (cause) {
      this.error.set(
        cause instanceof Error ? cause.message : 'The execution could not be changed.',
      );
    } finally {
      this.executionBusy.set(undefined);
    }
  }

  private isExecutionActive(execution: IExecutionRecord): boolean {
    return (
      execution.state === 'queued' || execution.state === 'running' || execution.state === 'waiting'
    );
  }

  // #endregion
}

function readStoredRunView(): RunView | undefined {
  const value = browserStorage()?.getItem(RUN_VIEW_STORAGE_KEY);
  return value === 'agents' || value === 'actions' ? value : undefined;
}
