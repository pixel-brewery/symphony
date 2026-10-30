// #region Imports

import { computed, DestroyRef, effect, inject, Injectable, signal } from '@angular/core';
import type { IExecutionRecord } from '@symphony/domain-execution';
import {
  Command,
  continuousIntegrationRefreshDelay,
  ORCHESTRATION_CLIENT,
} from '@symphony/frontend-core';
import { AUTOMATION_PREPARATION } from '@symphony/frontend-core/automation';
import { CI_OPERATIONS } from '@symphony/frontend-core/ci';
import { DESKTOP_CLIENT } from '@symphony/frontend-core/desktop';
import { REPOSITORY_RUNTIME_OPERATIONS } from '@symphony/frontend-core/workspace';
import type { ApplicationSettingsDto, ResponsePayload } from '@symphony/ipc-contracts-composition';
import {
  buildRailRuns,
  type IRailRun,
  resolveMenuBarStatus,
  selectMenuBarRuns,
} from '@symphony/frontend-feature-execution/projections';
import { ExecutionControls } from '@symphony/frontend-feature-execution';
import { DesktopUpdateStore } from '@symphony/frontend-update';

// #endregion

type ExecutionState = ResponsePayload<'execution-state.get'>;
type AutonomyStatus = ResponsePayload<'autonomy.status.get'>;
type RepositoryRuntimeStatus = ResponsePayload<'repositories.runtime.list'>[number];
type ContinuousIntegrationState = ResponsePayload<'ci.runs.refresh'>;

@Injectable()
export class MenuBarViewPresenter {
  // #region Fields

  private readonly _client = inject(ORCHESTRATION_CLIENT);
  private readonly _desktop = inject(DESKTOP_CLIENT);
  private readonly _executions = inject(ExecutionControls, { optional: true });
  private readonly _destroyRef = inject(DestroyRef);
  private readonly _repositoryRuntimeAvailable =
    inject(REPOSITORY_RUNTIME_OPERATIONS, { optional: true }) !== null;

  /** Whether this product contributes isolated execution controls. @public @readonly */
  public readonly executionAvailable = this._executions !== null;
  /** Whether this product includes Actions. @public @readonly */
  public readonly ciAvailable = inject(CI_OPERATIONS, { optional: true }) !== null;
  /** Whether this product includes autonomous work. @public @readonly */
  public readonly autonomyAvailable = inject(AUTOMATION_PREPARATION, { optional: true }) !== null;

  /**
   * The updates.
   *
   * @public
   * @readonly
   */
  public readonly updates = inject(DesktopUpdateStore);
  private readonly _settings = signal<ApplicationSettingsDto | undefined>(undefined);

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
   * The autonomy.
   *
   * @public
   * @readonly
   */
  public readonly autonomy = signal<AutonomyStatus | undefined>(undefined);
  private readonly _repositoryRuntimeStatuses = signal<readonly RepositoryRuntimeStatus[]>([]);

  /**
   * The now.
   *
   * @public
   * @readonly
   */
  public readonly now = signal(Date.now());

  /**
   * The loading.
   *
   * @public
   * @readonly
   */
  public readonly loading = signal(true);

  /**
   * The error.
   *
   * @public
   * @readonly
   */
  public readonly error = signal<string | undefined>(undefined);

  /**
   * The actions error.
   *
   * @public
   * @readonly
   */
  public readonly actionsError = signal<string | undefined>(undefined);

  /**
   * The autonomy busy.
   *
   * @public
   * @readonly
   */
  public readonly autonomyBusy = signal(false);

  /**
   * The execution busy.
   *
   * @public
   * @readonly
   */
  public readonly executionBusy = signal<string | undefined>(undefined);
  private _refreshInFlight?: Promise<void>;
  private _continuousIntegrationRefreshInFlight?: Promise<void>;
  private _continuousIntegrationRefreshTimer?: number;

  /**
   * The capacity.
   *
   * @public
   * @readonly
   */
  public readonly capacity = computed(
    () => this.autonomy() ?? { enabled: false, maximum: 1, active: 0, available: 1 },
  );

  /**
   * The capacity percent.
   *
   * @public
   * @readonly
   */
  public readonly capacityPercent = computed(() => {
    const capacity = this.capacity();
    return Math.min(100, Math.round((capacity.active / capacity.maximum) * 100));
  });

  /**
   * Steps that were accepted and take the next free slots before anything else.
   *
   * @public
   * @readonly
   */
  public readonly queuedSteps = computed(() => this._executionState().executionQueue);

  /**
   * The provider-neutral run timeline shared with the workspace rail.
   *
   * @public
   * @readonly
   */
  public readonly railRuns = computed(() => {
    const state = this._executionState();
    const continuousIntegration = this._continuousIntegration();
    const settings = this._settings();
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
   * Up to three agent runs, with active work first.
   *
   * @public
   * @readonly
   */
  public readonly agentRuns = computed(() => selectMenuBarRuns(this.railRuns(), 'agent'));

  /**
   * Up to three GitHub or local Actions runs, with active work first.
   *
   * @public
   * @readonly
   */
  public readonly actionRuns = computed(() => selectMenuBarRuns(this.railRuns(), 'actions'));

  /**
   * The active agent run count.
   *
   * @public
   * @readonly
   */
  public readonly activeAgentRunCount = computed(
    () => this.railRuns().filter((run) => run.kind === 'agent' && run.active).length,
  );

  /**
   * The active Actions run count.
   *
   * @public
   * @readonly
   */
  public readonly activeActionRunCount = computed(
    () => this.railRuns().filter((run) => run.kind !== 'agent' && run.active).length,
  );

  /**
   * The semantic state projected onto the native menu-bar mark.
   *
   * @public
   * @readonly
   */
  public readonly menuBarStatus = computed(() => resolveMenuBarStatus(this.railRuns()));

  /**
   * Execution ids that can be paused from a run submenu.
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
   * Execution ids that can be resumed from a run submenu.
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

  /**
   * The active workspace.
   *
   * @public
   * @readonly
   */
  public readonly activeWorkspace = computed(() => {
    const settings = this._settings();
    return settings?.workspaces.find(
      (workspace) => workspace.id === settings.activeViewScope.workspaceIds[0],
    );
  });

  /**
   * The repositories needing preparation.
   *
   * @public
   * @readonly
   */
  public readonly repositoriesNeedingPreparation = computed(() => {
    const workspaceId = this.activeWorkspace()?.id;
    if (!workspaceId) return [];
    return this._repositoryRuntimeStatuses().filter(
      (status) => status.workspaceId === workspaceId && status.preparation.state !== 'prepared',
    );
  });

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
  private readonly _openSymphonyCommand: Command<void> = new Command(
    () => void this.onExecuteOpenSymphonyCommand('current'),
  );
  private readonly _openSettingsCommand: Command<void> = new Command(
    () => void this.onExecuteOpenSymphonyCommand('settings'),
  );
  private readonly _openRunCommand: Command<IRailRun> = new Command(
    (run) => void this.onExecuteOpenSymphonyCommand(run.kind === 'agent' ? 'current' : 'actions'),
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
   * Pauses the execution the panel row identifies.
   *
   * @public
   * @readonly
   */
  public get pauseExecutionCommand(): Command<string> {
    return this._pauseExecutionCommand;
  }

  /**
   * Resumes the execution the panel row identifies.
   *
   * @public
   * @readonly
   */
  public get resumeExecutionCommand(): Command<string> {
    return this._resumeExecutionCommand;
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
   * Opens the Symphony window on the settings route.
   *
   * @public
   * @readonly
   */
  public get openSettingsCommand(): Command<void> {
    return this._openSettingsCommand;
  }

  /**
   * Opens the owning Symphony run surface.
   *
   * @public
   * @readonly
   */
  public get openRunCommand(): Command<IRailRun> {
    return this._openRunCommand;
  }

  /**
   * Installs a ready update, otherwise checks for one.
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
   * Initializes.
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

  private async onExecuteOpenSymphonyCommand(
    route: 'current' | 'settings' | 'actions',
  ): Promise<void> {
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
      const [settings, executionState, autonomy, repositoryStatuses] = await Promise.all([
        this._client.request('settings.get', {}),
        this.executionAvailable ? this._client.request('execution-state.get', {}) : undefined,
        this.autonomyAvailable ? this._client.request('autonomy.status.get', {}) : undefined,
        this._repositoryRuntimeAvailable
          ? this._client.request('repositories.runtime.list', {})
          : undefined,
      ]);
      this._settings.set(settings);
      if (executionState) this._executionState.set(executionState);
      if (autonomy) this.autonomy.set(autonomy);
      if (repositoryStatuses) this._repositoryRuntimeStatuses.set(repositoryStatuses);
      await this.refreshContinuousIntegrationState();
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
    if (!this.ciAvailable || !this._settings()?.ciBindings.some((binding) => binding.enabled))
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
