// #region Imports

import { computed, inject, Injectable, signal } from '@angular/core';
import type { ICiRunDetails } from '@symphony/domain-ci';
import {
  DRAWER_REF,
  DRAWER_REF_DATA,
  type IDrawerRef,
} from '@pixel-brewery/mosaik-elements-angular';
import { Command, Hydratable, ViewPresenter } from '@symphony/frontend-core';
import { NotificationService } from '@symphony/frontend-notification';
import type { IActionDrawerData } from '../views/drawers/IActionDrawerData';
import type { IActionDrawerSourceState } from '../views/drawers/IActionDrawerSourceState';
import { CiStore } from '../../state/CiStore';
import { CI_CLIENT } from '../../ports/CiClientToken';
import { CI_ACTION_CONTEXT } from '../../ports/CiActionContextToken';
import { resolveActionRunControls } from './actionRunControls/index';
import { buildActionLogView } from './buildActionLogView';
import { resolveLocalActionExecution } from './resolveLocalActionExecution';

// #endregion

function updatedSourceStates(
  sources: readonly IActionDrawerSourceState[] | undefined,
  kind: IActionDrawerSourceState['kind'],
  state: string,
): readonly IActionDrawerSourceState[] | undefined {
  if (!sources) return undefined;
  return sources.map((source) => (source.kind === kind ? { ...source, state } : source));
}

@Injectable()
export class ActionDrawerViewPresenter extends Hydratable(ViewPresenter) {
  // #region Fields

  private readonly _context = inject(CI_ACTION_CONTEXT);
  private readonly _ci = inject(CiStore);
  private readonly _drawerRef = inject(DRAWER_REF) as IDrawerRef<IActionDrawerData>;
  private readonly _data = inject<IActionDrawerData>(DRAWER_REF_DATA);
  private readonly _client = inject(CI_CLIENT);
  private readonly _notifications = inject(NotificationService);
  /** @public */ public readonly approvalBusy = signal(false);
  /** @public */ public readonly approvalUncertain = signal(false);
  /** @public */ public readonly approvalComment = signal('');
  /** @public */ public readonly selectedJobId = signal<string | undefined>(undefined);
  private _refreshTimer?: number;
  private _logOffset = 0;
  private _logComplete = false;
  private _logLoadFailed = false;
  private _logKind?: 'output' | 'failure';

  /**
   * The details.
   *
   * @public
   * @readonly
   */
  public readonly details = signal<ICiRunDetails | undefined>(undefined);

  /**
   * The full log.
   *
   * @public
   * @readonly
   */
  public readonly fullLog = signal('');

  /**
   * The load failed.
   *
   * @public
   * @readonly
   */
  public readonly loadFailed = signal(false);

  /**
   * The run.
   *
   * @public
   * @readonly
   */
  public readonly run = computed(() => {
    const snapshot = this._context.snapshot();
    const run = this._data.run;
    if (!run.ciRunId) return run;
    const current = snapshot?.ciRuns?.find((candidate) => candidate.id === run.ciRunId);
    const sources = current
      ? updatedSourceStates(run.sources, 'github', current.status)
      : run.sources;
    if (run.kind === 'cloud-action') {
      return current
        ? {
            ...run,
            sources,
            state: current.status,
            active: current.status === 'in-progress',
            ...(current.finishedAt ? { finishedAt: current.finishedAt } : {}),
          }
        : run;
    }
    if (run.kind !== 'local-action') return run;
    if (this._ci.localCiRunningRunId() === run.ciRunId) {
      return {
        ...run,
        sources: updatedSourceStates(sources, 'local-runner', 'in-progress'),
        state: 'in-progress',
        active: true,
      };
    }
    const terminal = resolveLocalActionExecution(
      run.ciRunId,
      run.startedAt,
      snapshot?.localCiExecutions ?? [],
      run.runAttempt,
    );
    return terminal
      ? {
          ...run,
          sources: updatedSourceStates(sources, 'local-runner', terminal.state),
          state: terminal.state,
          active: false,
          ...(terminal.finishedAt ? { finishedAt: terminal.finishedAt } : {}),
          ...(terminal.failureLog ? { failureLog: terminal.failureLog } : {}),
          ...(terminal.localDiagnostics ? { localDiagnostics: terminal.localDiagnostics } : {}),
        }
      : { ...run, sources };
  });

  /**
   * The current CI run.
   *
   * @public
   * @readonly
   */
  public readonly currentCiRun = computed(() => {
    const runId = this.run().ciRunId;
    return this._context.snapshot()?.ciRuns?.find((candidate) => candidate.id === runId);
  });

  /**
   * The controls.
   *
   * @public
   * @readonly
   */
  public readonly controls = computed(() =>
    resolveActionRunControls(
      this.currentCiRun(),
      this._ci.localCiEnabledFor(this.currentCiRun()?.workspaceId),
      this._ci.localCiRunningRunId(),
    ),
  );

  private readonly _runIsActive = computed(() => {
    const run = this.run();
    if (run.kind === 'local-action') {
      return this._ci.localCiRunningRunId() === run.ciRunId;
    }
    return run.active;
  });

  /**
   * The github context.
   *
   * @public
   * @readonly
   */
  public readonly githubContext = computed(() => {
    const runId = this.run().ciRunId;
    const snapshot = this._context.snapshot();
    const ciRun = snapshot?.ciRuns?.find((candidate) => candidate.id === runId);
    if (!ciRun) return undefined;
    const repository = this._context
      .settings()
      ?.repositoryBindings.find((candidate) => candidate.id === ciRun.repositoryBindingId);
    if (!repository || repository.provider !== 'github') return undefined;
    const root = repository.host.includes('://') ? repository.host : `https://${repository.host}`;
    return {
      repositoryLabel: repository.displayName,
      repositoryUrl: new URL(`/${repository.owner}/${repository.name}`, root).toString(),
      branch: ciRun.branch,
      targetUrl: this.run().externalUrl,
    };
  });

  /**
   * The log view.
   *
   * @public
   * @readonly
   */
  public readonly logView = computed(() => {
    const details = this.details();
    return buildActionLogView(
      details?.jobs ?? [],
      this.fullLog(),
      details?.logOutput,
      details?.failureLog,
      details?.localDiagnostics,
    );
  });

  /**
   * Whether it is running.
   *
   * @public
   * @readonly
   */
  public readonly isRunning = computed(() => {
    const jobs = this.details()?.jobs;
    return this._runIsActive() || Boolean(jobs?.some((job) => job.status === 'in-progress'));
  });

  private readonly _shouldRefresh = computed(
    () =>
      this._runIsActive() ||
      this.currentCiRun()?.status === 'queued' ||
      Boolean(
        this.details()?.jobs.some((job) => job.status === 'queued' || job.status === 'in-progress'),
      ),
  );

  private readonly _runLogAvailable = computed(() => {
    const status = this.currentCiRun()?.status;
    return status === undefined || !['queued', 'in-progress'].includes(status);
  });

  private readonly _cancelRemoteRunCommand: Command<void> = new Command(
    () => void this.onExecuteCancelRemoteRunCommand(),
  );
  private readonly _rerunRemoteCommand: Command<void> = new Command(
    () => void this.onExecuteRerunRemoteCommand(),
  );
  private readonly _runLocallyCommand: Command<void> = new Command(
    () => void this.onExecuteRunLocallyCommand(),
  );
  private readonly _stopLocalRunCommand: Command<void> = new Command(
    () => void this.onExecuteStopLocalRunCommand(),
  );
  private readonly _closeCommand: Command<void> = new Command(
    () => void this.onExecuteCloseCommand(),
  );
  /** @public */ public readonly reviewApprovalCommand = new Command<
    readonly [number, 'approved' | 'rejected']
  >((args) => void this.reviewApproval(args[0], args[1]));
  /** @public */ public readonly selectJobCommand = new Command<string>(
    (args) => void this.selectJob(args),
  );
  // #endregion

  // #region Properties

  /**
   * The cancelRemoteRun command.
   *
   * @public
   * @readonly
   */
  public get cancelRemoteRunCommand(): Command<void> {
    return this._cancelRemoteRunCommand;
  }
  /**
   * The rerunRemote command.
   *
   * @public
   * @readonly
   */
  public get rerunRemoteCommand(): Command<void> {
    return this._rerunRemoteCommand;
  }
  /**
   * The runLocally command.
   *
   * @public
   * @readonly
   */
  public get runLocallyCommand(): Command<void> {
    return this._runLocallyCommand;
  }
  /**
   * The stopLocalRun command.
   *
   * @public
   * @readonly
   */
  public get stopLocalRunCommand(): Command<void> {
    return this._stopLocalRunCommand;
  }
  /**
   * The close command.
   *
   * @public
   * @readonly
   */
  public get closeCommand(): Command<void> {
    return this._closeCommand;
  }
  // #endregion

  // #region Methods

  /**
   * Handles hydrate.
   *
   * @public
   */
  public override async onHydrate(): Promise<void> {
    await this.refreshDetails();
  }

  /**
   * Disposes.
   *
   * @public
   */
  public override dispose(): void {
    if (this._refreshTimer !== undefined) window.clearTimeout(this._refreshTimer);
    this._refreshTimer = undefined;
    super.dispose();
  }

  /**
   * Cancels the remote run.
   *
   * @private
   */
  private async onExecuteCancelRemoteRunCommand(): Promise<void> {
    const run = this.currentCiRun();
    if (!run || !this.controls().canCancelRemote) return;
    await this._ci.cancelCiRun(run.id);
  }

  /**
   * Returns the rerun remote.
   *
   * @private
   */
  private async onExecuteRerunRemoteCommand(): Promise<void> {
    const run = this.currentCiRun();
    if (!run || !this.controls().canRerunRemote) return;
    await this._ci.rerunCiRun(run.id);
  }

  /**
   * Runs the locally.
   *
   * @private
   */
  private async onExecuteRunLocallyCommand(): Promise<void> {
    const run = this.currentCiRun();
    if (!run || !this.controls().canRunLocally) return;
    await this._ci.runCiLocally(run.id);
  }

  /**
   * Stops the local run.
   *
   * @private
   */
  private async onExecuteStopLocalRunCommand(): Promise<void> {
    const runId = this.run().ciRunId;
    if (!runId || !this.controls().canStopLocal) return;
    await this._ci.cancelLocalCiRun(runId);
  }

  /**
   * Closes.
   *
   * @private
   */
  private onExecuteCloseCommand(): void {
    this._drawerRef.close();
  }

  /** Refreshes the permission and exact run revision at the provider boundary. @public */
  private async reviewApproval(
    environmentId: number,
    decision: 'approved' | 'rejected',
  ): Promise<void> {
    const run = this.currentCiRun();
    const revision = this.details()?.workflowGraph?.revision ?? run?.revision;
    if (
      !run ||
      !revision ||
      this.approvalBusy() ||
      this.approvalUncertain() ||
      !this.approvalComment().trim()
    )
      return;
    this.approvalBusy.set(true);
    try {
      await this._client.request('ci.approval.review', {
        runId: run.id,
        revision,
        environmentIds: [environmentId],
        decision,
        comment: this.approvalComment(),
      });
      this.approvalComment.set('');
    } catch (cause) {
      this.approvalUncertain.set(true);
      this._notifications.showError(
        'The approval outcome could not be confirmed.',
        cause instanceof Error
          ? cause.message
          : 'Refresh and inspect the pending deployment on GitHub before another review.',
      );
    } finally {
      await this.refreshDetails();
      this.approvalBusy.set(false);
    }
  }

  /** Brings an actual matrix execution into the existing accessible log surface. @public */
  private selectJob(id: string): void {
    this.selectedJobId.set(id);
    requestAnimationFrame(() =>
      document
        .querySelector(`[test-id="action-detail-job-${CSS.escape(id)}"]`)
        ?.scrollIntoView({ block: 'nearest' }),
    );
  }

  private async refreshDetails(): Promise<void> {
    const runId = this.run().ciRunId;
    if (!runId) {
      this.loadFailed.set(true);
      return;
    }
    try {
      const details = await this._ci.loadContinuousIntegrationRunDetails(runId);
      const run = this.run();
      this.details.set({
        ...details,
        ...(details.failureLog
          ? { failureLog: details.failureLog }
          : run.failureLog
            ? { failureLog: run.failureLog }
            : {}),
        ...(run.localDiagnostics ? { localDiagnostics: run.localDiagnostics } : {}),
      });
      this.loadFailed.set(false);
    } catch {
      this.loadFailed.set(true);
    }
    if (this._runLogAvailable()) {
      try {
        await this.refreshRunLog(runId);
        this._logLoadFailed = false;
      } catch {
        // GitHub exposes the complete run log only after processing. Reopening the drawer retries
        // a terminal failure without turning one unavailable artifact into a permanent poll loop.
        this._logComplete = true;
        this._logLoadFailed = true;
      }
    }
    if (this._shouldRefresh() || (this._runLogAvailable() && !this._logComplete)) {
      this._refreshTimer = window.setTimeout(
        () => {
          this._refreshTimer = undefined;
          void this.refreshDetails();
        },
        this._shouldRefresh() || this._logComplete || this._logLoadFailed ? 5_000 : 250,
      );
    }
  }

  private async refreshRunLog(runId: string): Promise<void> {
    const kind = 'output' as const;
    if (this._logKind !== kind) {
      this._logKind = kind;
      this._logOffset = 0;
      this._logComplete = false;
      this.fullLog.set('');
    }
    const chunk = await this._ci.loadContinuousIntegrationRunLog(runId, kind, this._logOffset);
    if (chunk.offset < this._logOffset) {
      this._logOffset = 0;
      this.fullLog.set('');
    }
    if (chunk.content) this.fullLog.update((current) => current + chunk.content);
    this._logOffset = chunk.nextOffset;
    this._logComplete = chunk.complete;
  }

  // #endregion
}
