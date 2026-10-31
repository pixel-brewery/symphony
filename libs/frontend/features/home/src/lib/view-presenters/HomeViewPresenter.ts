// #region Imports

import { computed, effect, inject, Injectable, signal, untracked } from '@angular/core';
import { Router } from '@angular/router';
import type { ICiRunHistory } from '@symphony/domain-ci';
import type { IDeliverySnapshot } from '@symphony/domain-delivery';
import type { IWorkflowStageChangeHistory } from '@symphony/domain-workflow';
import {
  Clock,
  Command,
  ViewPresenter,
  workItemIdsNeedingAttention,
} from '@symphony/frontend-core';
import type { IInboxEntry } from '../inbox/IInboxEntry';
import { projectBoardColumnBars } from '../overview/projectBoardColumnBars';
import { projectProductionSummary } from '../overview/projectProductionSummary';
import { projectPullRequestStates } from '../overview/projectPullRequestStates';
import { projectReporting } from '../overview/projectReporting';
import { reportingHistorySince } from '../overview/reportingHistorySince';
import type { ReportingPeriod } from '../overview/ReportingPeriod';
import { HOME_CONTEXT } from '../ports/HomeContextToken';
import { OrbitStateStore } from '../state/OrbitStateStore';
import { InboxStore } from '../state/InboxStore';
import { projectOrbitClusters } from './projectOrbitClusters';

// #endregion

/** Overview shows the oldest decisions; the Inbox holds the rest. */
const WAITING_DECISIONS = 4;

/** Where a card's data stands: a skeleton while loading, a retry after a failure. */
type CardState = 'loading' | 'failed' | 'ready';

/**
 * Coordinates the Overview start page: the greeting with what needs attention, the quick
 * actions, the `Waiting for you`, `Pull requests` and `Production` cards, and `Reporting` for the
 * selected period. Every figure is projected from the workspace's own snapshot, the shared Inbox
 * and Orbit's delivery evidence.
 *
 * @public
 */
@Injectable()
export class HomeViewPresenter extends ViewPresenter {
  // #region Fields

  private readonly _context = inject(HOME_CONTEXT);
  private readonly _inbox = inject(InboxStore);
  private readonly _clock = inject(Clock);
  private readonly _router = inject(Router);
  private readonly _orbitState = inject(OrbitStateStore);
  private readonly _ready = signal(false);
  private readonly _delivery = signal<IDeliverySnapshot | undefined>(undefined);
  private readonly _deliveryState = signal<CardState>('loading');
  private readonly _syncing = signal(false);
  private readonly _stageHistory = signal<IWorkflowStageChangeHistory | undefined>(undefined);
  private readonly _stageHistoryState = signal<CardState>('loading');
  private readonly _runHistory = signal<ICiRunHistory | undefined>(undefined);
  private readonly _runHistoryState = signal<CardState>('loading');
  private _deliveryRequest = 0;
  private _deliveryScope = '';
  private _historyRequest = 0;
  private _historyKey = '';

  // #endregion

  // #region Ctor

  /**
   * Refreshes Orbit's delivery evidence whenever the active scope changes, and the recorded
   * history whenever the scope or the reporting period changes.
   *
   * @public
   */
  public constructor() {
    super();
    effect(() => {
      const scope = JSON.stringify([...this._context.selectedWorkspaceIds()].toSorted());
      if (!this._ready() || scope === this._deliveryScope) return;
      this._deliveryScope = scope;
      untracked(() => void this.refreshDelivery());
    });
    effect(() => {
      const key = JSON.stringify([
        [...this._context.selectedWorkspaceIds()].toSorted(),
        this.period(),
      ]);
      if (!this._ready() || key === this._historyKey) return;
      this._historyKey = key;
      untracked(() => void this.refreshHistory());
    });
  }

  // #endregion

  // #region Properties

  /** Whether the first snapshot has arrived. @public @readonly */
  public readonly hasSnapshot = this._context.hasSnapshot;

  /** The first confirmed upstream incident with operator-relevant impact. @public @readonly */
  public readonly externalServiceIncident = this._context.externalServiceIncident;

  /** The shared clock, for the date, the greeting and relative ages. @public @readonly */
  public readonly now = this._clock.now;

  /** Name of the active workspace, for the toolbar subtitle. @public @readonly */
  public readonly workspaceName = computed(() => this._context.activeWorkspace()?.displayName);

  /** Repositories of the active scope, named under `Reporting`. @public @readonly */
  public readonly repositories = this._context.scopedRepositories;

  /** Number of decisions waiting in the Inbox, `undefined` while loading. @public @readonly */
  public readonly decisionCount = this._inbox.decisionCount;

  /** Name of the first workflow whose newest run failed. @public @readonly */
  public readonly failingWorkflowName = computed(
    () => this._inbox.decisions().find((entry) => entry.kind === 'failing-workflow')?.workflowName,
  );

  /**
   * The newest step an agent is running right now, for the greeting's summary.
   *
   * @public
   * @readonly
   */
  public readonly activeAgentWork = computed(() => {
    const snapshot = this._context.snapshot();
    if (!snapshot) return undefined;
    const execution = snapshot.executions
      .filter((candidate) => candidate.state === 'running' && candidate.mode !== 'manual')
      .toSorted((left, right) => right.startedAt.localeCompare(left.startedAt))[0];
    if (!execution) return undefined;
    const agent = this._context
      .settings()
      ?.agentProfiles.find((profile) => profile.id === execution.bindingSnapshot?.agentProfileId);
    const item = snapshot.workItems.find((candidate) => candidate.id === execution.workItemId);
    return {
      agentName: agent?.displayName,
      workItemKey: item?.externalId,
      implementing: execution.kind === 'solution' || execution.kind === 'revision',
    };
  });

  /**
   * The four oldest decisions, in the Inbox's order (newest first).
   *
   * @public
   * @readonly
   */
  public readonly waitingDecisions = computed<readonly IInboxEntry[]>(() =>
    this._inbox
      .decisions()
      .toSorted((left, right) => left.at.localeCompare(right.at))
      .slice(0, WAITING_DECISIONS)
      .toSorted((left, right) => right.at.localeCompare(left.at)),
  );

  /** When the oldest decision started waiting. @public @readonly */
  public readonly oldestDecisionAt = computed(
    () =>
      this._inbox
        .decisions()
        .map((entry) => entry.at)
        .toSorted()[0],
  );

  /** Whether the pull requests are loading, failed or ready. @public @readonly */
  public readonly pullRequestsState = computed<CardState>(() =>
    this.sourceState(this._context.snapshot()?.remoteData?.pullRequests?.state),
  );

  /**
   * GitHub logins the selected workspaces are signed in with, lower-cased, as the Board's `Mine`
   * filter reads them; empty when no connection names its account.
   *
   * @public
   * @readonly
   */
  public readonly viewerLogins = computed<ReadonlySet<string>>(() => {
    const workspaceIds = new Set(this._context.selectedWorkspaceIds());
    return new Set(
      (this._context.settings()?.connections ?? []).flatMap((connection) =>
        connection.kind === 'github' &&
        (!workspaceIds.size || workspaceIds.has(connection.workspaceId)) &&
        connection.accountLogin?.trim()
          ? [connection.accountLogin.trim().toLocaleLowerCase()]
          : [],
      ),
    );
  });

  /** Open pull requests by state. @public @readonly */
  public readonly pullRequestCounts = computed(() => {
    const snapshot = this._context.snapshot();
    return projectPullRequestStates(
      snapshot?.pullRequests ?? [],
      snapshot?.ciRuns ?? [],
      snapshot?.localCiExecutions ?? [],
      this.viewerLogins(),
    );
  });

  /** Whether Orbit's delivery evidence is loading, failed or ready. @public @readonly */
  public readonly productionState = this._deliveryState.asReadonly();

  /**
   * The project Orbit shows: the one chosen there, else the first of the scope, as in Orbit.
   *
   * @public
   * @readonly
   */
  public readonly orbitRepository = computed(
    () =>
      this._context
        .scopedRepositories()
        .find((repository) => repository.id === this._orbitState.orbitRepositoryId()) ??
      this._context.scopedRepositories()[0],
  );

  /**
   * The Production card: Orbit's evidence and the figures Orbit's inspector shows for its default
   * cluster (`Needs attention`, else the first cluster) of that project.
   *
   * @public
   * @readonly
   */
  public readonly production = computed(() => {
    const delivery = this._delivery();
    const snapshot = this._context.snapshot();
    if (!delivery || !snapshot) return undefined;
    const repository = this.orbitRepository();
    const items = this._context
      .scopedWorkItems()
      .filter(
        (item) =>
          !repository ||
          (item.repositoryBindingIds?.length
            ? item.repositoryBindingIds.includes(repository.id)
            : !item.repository || item.repository === `${repository.owner}/${repository.name}`),
      );
    const clusters = projectOrbitClusters(items, snapshot, this._context.activeBoardId()).clusters;
    const cluster = clusters.find((candidate) => candidate.kind === 'attention') ?? clusters[0];
    return projectProductionSummary({
      delivery,
      configuredTargets: this._context.settings()?.deliveryTargets ?? [],
      workspaceIds: this._context.selectedWorkspaceIds(),
      ...(repository ? { repositoryBindingId: repository.id } : {}),
      clusterItemIds: cluster?.memberIds ?? [],
    });
  });

  /** The selected reporting period. @public @readonly */
  public readonly period = signal<ReportingPeriod>('7-days');

  /** Whether the recorded stage changes are loading, failed or ready. @public @readonly */
  public readonly stageHistoryState = this._stageHistoryState.asReadonly();

  /** Whether the recorded workflow runs are loading, failed or ready. @public @readonly */
  public readonly runHistoryState = this._runHistoryState.asReadonly();

  /** Every reporting figure of the selected period. @public @readonly */
  public readonly reporting = computed(() => {
    const snapshot = this._context.snapshot();
    if (!snapshot) return undefined;
    const stageHistory = this._stageHistory();
    const runHistory = this._runHistory();
    return projectReporting({
      period: this.period(),
      now: this._clock.now(),
      executions: snapshot.executions,
      ciRuns: snapshot.ciRuns ?? [],
      workflow: snapshot.workflow,
      ...(this._stageHistoryState() === 'ready' && stageHistory ? { stageHistory } : {}),
      ...(this._runHistoryState() === 'ready' && runHistory ? { runHistory } : {}),
    });
  });

  /**
   * Top of the `Delivered per week` axis: the fullest week rounded up to a multiple of five.
   *
   * @public
   * @readonly
   */
  public readonly deliveredScale = computed(() => {
    const fullest = Math.max(
      0,
      ...(this.reporting()?.deliveredPerWeek ?? []).map((week) => week.count ?? 0),
    );
    return Math.max(5, Math.ceil(fullest / 5) * 5);
  });

  /** Whether the work items are loading, failed or ready. @public @readonly */
  public readonly boardState = computed<CardState>(() =>
    this.sourceState(this._context.snapshot()?.remoteData?.workItems.state),
  );

  /** Work items per board column. @public @readonly */
  public readonly boardBars = computed(() =>
    projectBoardColumnBars(
      this._context.snapshot()?.boardColumns ?? [],
      this._context.activeBoardId(),
      this._context.scopedWorkItems(),
    ),
  );

  /** Work items on the board. @public @readonly */
  public readonly workItemCount = computed(() => this._context.scopedWorkItems().length);

  /** Work items that need the user, exactly as the Board's attention filter counts them. @public @readonly */
  public readonly attentionCount = computed(() => {
    const snapshot = this._context.snapshot();
    return workItemIdsNeedingAttention(
      this._context.scopedWorkItems(),
      snapshot?.executions ?? [],
      {
        stages: snapshot?.workflow.stages ?? [],
        fields: snapshot?.projectFields ?? [],
        readiness: snapshot?.workItemReadiness ?? [],
      },
    ).size;
  });

  /** Whether the current workflow runs are loading, failed or ready. @public @readonly */
  public readonly runsState = computed<CardState>(() =>
    this.sourceState(this._context.snapshot()?.remoteData?.ciRuns?.state),
  );

  /**
   * The `Workflow runs` card: loading while either the current runs or the recorded history
   * loads, failed when either failed.
   *
   * @public
   * @readonly
   */
  public readonly workflowRunsState = computed<CardState>(() => {
    const states = [this.runsState(), this._runHistoryState()];
    if (states.includes('failed')) return 'failed';
    return states.includes('loading') ? 'loading' : 'ready';
  });

  /** Workflow runs that are in progress or queued right now. @public @readonly */
  public readonly activeRuns = computed(() => {
    const runs = this._context.snapshot()?.ciRuns ?? [];
    return {
      inProgress: runs.filter((run) => run.status === 'in-progress').length,
      queued: runs.filter((run) => run.status === 'queued').length,
    };
  });

  /** Whether `Sync now` is refreshing. @public @readonly */
  public readonly syncing = computed(() => this._syncing() || this._context.syncBusy());

  /** Refreshes work items, pull requests and Actions from GitHub. @public @readonly */
  public readonly syncCommand = new Command<void>(
    () => void this.sync(),
    computed(() => !this.syncing()),
  );

  /** Opens Actions, where a workflow is run on GitHub or locally. @public @readonly */
  public readonly runWorkflowCommand = new Command<void>(
    () => void this._router.navigate(['/main/actions']),
  );

  /** Opens the new-work-item sheet over the Board. @public @readonly */
  public readonly newWorkItemCommand = new Command<void>(
    () => void this._router.navigate(['/main/board'], { queryParams: { create: 'true' } }),
  );

  /** Opens a screen. @public @readonly */
  public readonly openCommand = new Command<string>((path) => void this._router.navigate([path]));

  /** Opens the Board narrowed to one column, as the column filter does. @public @readonly */
  public readonly openBoardColumnCommand = new Command<string>(
    (columnId) =>
      void this._router.navigate(['/main/board'], { queryParams: { column: columnId } }),
  );

  /** Opens one decision in the Inbox. @public @readonly */
  public readonly openDecisionCommand = new Command<string>(
    (entryId) => void this._router.navigate(['/main/inbox'], { queryParams: { entry: entryId } }),
  );

  /** Switches the reporting period. @public @readonly */
  public readonly selectPeriodCommand = new Command<ReportingPeriod>((period) =>
    this.period.set(period),
  );

  /** Reads Orbit's delivery evidence again after a failure. @public @readonly */
  public readonly retryProductionCommand = new Command<void>(() => void this.refreshDelivery());

  /** Reads the recorded stage changes and workflow runs again after a failure. @public @readonly */
  public readonly retryReportingCommand = new Command<void>(() => void this.refreshHistory());

  /**
   * Retries the `Workflow runs` figures: a GitHub refresh when the current runs failed, else the
   * recorded run history.
   *
   * @public
   * @readonly
   */
  public readonly retryWorkflowRunsCommand = new Command<void>(() =>
    this.runsState() === 'failed' ? void this.sync() : void this.refreshHistory(),
  );

  // #endregion

  // #region Methods

  /**
   * Joins the application bootstrap before the delivery evidence is read.
   *
   * @public
   */
  public override initialize(): void {
    super.initialize();
    void this._context.initialize().then(() => {
      if (!this.disposed()) this._ready.set(true);
    });
  }

  /** Loading until the snapshot arrives; a source that could not load at all failed. */
  private sourceState(state: 'current' | 'stale' | 'unavailable' | undefined): CardState {
    if (!this._context.snapshot()) return 'loading';
    return state === 'unavailable' ? 'failed' : 'ready';
  }

  private async sync(): Promise<void> {
    if (this._syncing()) return;
    this._syncing.set(true);
    try {
      await this._context.sync();
    } finally {
      if (!this.disposed()) this._syncing.set(false);
    }
    // A refresh records the runs it read and may have adopted stage changes from the board.
    if (!this.disposed()) void this.refreshHistory();
  }

  /**
   * Reads the recorded stage changes and workflow runs for the selected period. A newer read
   * supersedes an older one still in flight; each source keeps its own failure and retry.
   */
  private async refreshHistory(): Promise<void> {
    const request = ++this._historyRequest;
    const since = reportingHistorySince(this.period(), this._clock.now());
    const current = (): boolean => !this.disposed() && request === this._historyRequest;
    this._stageHistoryState.set('loading');
    this._runHistoryState.set('loading');
    await Promise.all([
      this._context.listStageChanges(since).then(
        (history) => {
          if (!current()) return;
          this._stageHistory.set(history);
          this._stageHistoryState.set('ready');
        },
        () => {
          if (current()) this._stageHistoryState.set('failed');
        },
      ),
      this._context.listRunHistory(since).then(
        (history) => {
          if (!current()) return;
          this._runHistory.set(history);
          this._runHistoryState.set('ready');
        },
        () => {
          if (current()) this._runHistoryState.set('failed');
        },
      ),
    ]);
  }

  private async refreshDelivery(): Promise<void> {
    const delivery = this._context.delivery;
    if (!delivery) {
      this._deliveryState.set('failed');
      return;
    }
    const request = ++this._deliveryRequest;
    this._deliveryState.set('loading');
    try {
      const snapshot = await delivery.refresh();
      if (this.disposed() || request !== this._deliveryRequest) return;
      this._delivery.set(snapshot);
      this._deliveryState.set('ready');
    } catch {
      if (!this.disposed() && request === this._deliveryRequest) this._deliveryState.set('failed');
    }
  }

  // #endregion
}
