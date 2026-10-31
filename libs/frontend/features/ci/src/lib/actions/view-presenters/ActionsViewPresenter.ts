// #region Imports

import { computed, effect, inject, Injectable, signal, untracked } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { DrawerService, type IDrawerRef } from '@pixel-brewery/mosaik-elements-angular';
import type { ICiRun, ICiRunDetails, ICiWorkflow } from '@symphony/domain-ci';
import {
  Clock,
  Command,
  EXECUTION_OPERATIONS,
  ExternalLinkService,
  Hydratable,
  ViewPresenter,
  WorkspaceScopePresenter,
} from '@symphony/frontend-core';
import { ApplicationBootstrap } from '@symphony/frontend-core/bootstrap';
import { RUN_STATUSES } from '@symphony/frontend-core/delivery';
import { NotificationService } from '@symphony/frontend-notification';
import type { ICollectionListMenuSelection } from '@symphony/frontend-ui';
import { CI_ACTION_CONTEXT } from '../../ports/CiActionContextToken';
import { CiStore } from '../../state/CiStore';
import { ActionDrawerView } from '../views/drawers/ActionDrawerView';
import type { IActionDrawerData } from '../views/drawers/IActionDrawerData';
import {
  type ActionsRunSort,
  resolveActionsListCommand,
  resolveActionsListMenus,
} from './actionsListPresentation';
import { buildActionRunRows } from './actionsOverview/buildActionRunRows';
import { buildRunStepRows } from './actionsOverview/buildRunStepRows';
import { composeFixFeedback } from './actionsOverview/composeFixFeedback';
import { excerptRunLog } from './actionsOverview/excerptRunLog';
import { findAgenticRecovery } from './actionsOverview/findAgenticRecovery';
import type { IActionRunControls } from './actionsOverview/IActionRunControls';
import type { IActionRunFilter } from './actionsOverview/IActionRunFilter';
import type { IActionRunRow } from './actionsOverview/IActionRunRow';
import { isActiveRunStatus } from './actionsOverview/isActiveRunStatus';
import { matchesActionRunFilter } from './actionsOverview/matchesActionRunFilter';
import { projectActionsOverview } from './actionsOverview/projectActionsOverview';
import { projectWorkflowList } from './actionsOverview/projectWorkflowList';
import { resolveActionRunControls } from './actionsOverview/resolveActionRunControls';
import { resolveFixWithAi } from './actionsOverview/resolveFixWithAi';
import { runTimestamp } from './actionsOverview/runTimestamp';
import { toActionDrawerRun } from './actionsOverview/toActionDrawerRun';
import { hydrateActionsRoute } from './routeHydration/hydrateActionsRoute';

// #endregion

/** Finished runs `History` shows at first and adds per `Show older runs`. */
const HISTORY_PAGE_SIZE = 10;
/** How often the steps of a run in progress are read again. */
const ACTIVE_DETAILS_REFRESH_MILLISECONDS = 10_000;

/**
 * The run details loaded for the selected run.
 *
 * @internal
 */
interface ISelectedRunDetails {
  readonly key: string;
  readonly details?: ICiRunDetails;
  readonly failed: boolean;
}

/**
 * Owns the `Actions` screen: `All runs` across every workflow, the `WORKFLOWS` list, a selected
 * workflow with its runs, the selected run's steps, log excerpt and diagnosis, and every run
 * command — dispatch on GitHub or the managed local runner, stop, cancel, rerun, run locally,
 * open in GitHub, the Action drawer and `Fix with AI`.
 *
 * The selected workflow lives in the `workflow` query parameter so Back and Forward step through
 * selections; `run` deep links select the run's workflow and run while the shell opens the drawer.
 *
 * @public
 */
@Injectable()
export class ActionsViewPresenter extends Hydratable(ViewPresenter) {
  // #region Fields

  /**
   * The workspace scope the screen hydrates in.
   *
   * @public
   * @readonly
   */
  public readonly scope = inject(WorkspaceScopePresenter);

  /** @public */ public readonly dispatchProposal = signal<ICiWorkflow | undefined>(undefined);
  /** @public */ public readonly dispatchRef = signal('');
  /** @public */ public readonly dispatchInputs = signal<Readonly<Record<string, string>>>({});

  private readonly _ci = inject(CiStore);
  private readonly _context = inject(CI_ACTION_CONTEXT);
  private readonly _bootstrap = inject(ApplicationBootstrap);
  private readonly _externalLinks = inject(ExternalLinkService);
  private readonly _notifications = inject(NotificationService);
  private readonly _drawers = inject(DrawerService);
  private readonly _executions = inject(EXECUTION_OPERATIONS, { optional: true });
  private readonly _route = inject(ActivatedRoute);
  private readonly _router = inject(Router);
  private readonly _queryParamMap = toSignal(this._route.queryParamMap, {
    initialValue: this._route.snapshot.queryParamMap,
  });
  private readonly _selectedRunId = signal<string | undefined>(undefined);
  private readonly _historyLimit = signal(HISTORY_PAGE_SIZE);
  private readonly _runDetails = signal<ISelectedRunDetails | undefined>(undefined);
  private _activeDrawer?: IDrawerRef<IActionDrawerData>;
  private _detailsTimer?: ReturnType<typeof setTimeout>;

  /**
   * Current time from the shared clock, for elapsed and start times.
   *
   * @public
   * @readonly
   */
  public readonly now = inject(Clock).now;

  /**
   * The workflow whose dispatch request is being sent.
   *
   * @public
   * @readonly
   */
  public readonly dispatchingWorkflowId = signal<string | undefined>(undefined);

  /**
   * The run `Fix with AI` is starting a revision for.
   *
   * @public
   * @readonly
   */
  public readonly fixingRunId = signal<string | undefined>(undefined);

  /**
   * The selected author filter.
   *
   * @public
   * @readonly
   */
  public readonly selectedActor = signal<string | undefined>(undefined);

  /**
   * The selected status filter; `?status=` links from Overview set it.
   *
   * @public
   * @readonly
   */
  public readonly selectedStatus = signal<ICiRun['status'] | undefined>(undefined);

  /**
   * Order of the finished runs.
   *
   * @public
   * @readonly
   */
  public readonly sort = signal<ActionsRunSort>('started-descending');

  /**
   * Workflow definitions of the selected workspaces.
   *
   * @public
   * @readonly
   */
  public readonly workflows = this._ci.workflows;

  /**
   * Availability of the GitHub projection; stale or failed data shows a retry.
   *
   * @public
   * @readonly
   */
  public readonly remoteData = this._ci.remoteData;

  /**
   * Whether a refresh is in flight.
   *
   * @public
   * @readonly
   */
  public readonly refreshing = this._ci.continuousIntegrationRunsBusy;

  /**
   * The normalized contextual search query.
   *
   * @public
   * @readonly
   */
  public readonly searchQuery = computed(
    () => this._queryParamMap().get('q')?.trim().toLocaleLowerCase() ?? '',
  );

  /**
   * Whether the managed local runner is busy with any run.
   *
   * @public
   * @readonly
   */
  public readonly localRunnerBusy = computed(() => Boolean(this._ci.localCiRunningRunId()));

  /**
   * Every run once, GitHub and local runner merged, newest first.
   *
   * @public
   * @readonly
   */
  public readonly runRows = computed(() => {
    const activeRunId = this._ci.localCiRunningRunId();
    return buildActionRunRows({
      runs: this._ci.runs(),
      localExecutions: this._context.snapshot()?.localCiExecutions ?? [],
      workflows: this.workflows(),
      ...(activeRunId
        ? {
            activeLocalRun: {
              runId: activeRunId,
              startedAt: this._ci.localCiStartedAt() ?? new Date(this.now()).toISOString(),
            },
          }
        : {}),
    });
  });

  /**
   * The `WORKFLOWS` list with each workflow's dot.
   *
   * @public
   * @readonly
   */
  public readonly workflowEntries = computed(() =>
    projectWorkflowList(this.workflows(), this.runRows()),
  );

  /**
   * The selected workflow id, or `all` for `All runs`.
   *
   * @public
   * @readonly
   */
  public readonly selectedWorkflowId = computed<'all' | string>(() => {
    const workflowId = this._queryParamMap().get('workflow');
    if (workflowId) return workflowId;
    const runId = this._queryParamMap().get('run');
    return (runId && this.runRows().find((row) => row.id === runId)?.workflowId) || 'all';
  });

  /**
   * The selected workflow; `undefined` shows `All runs`.
   *
   * @public
   * @readonly
   */
  public readonly selectedWorkflow = computed(() => {
    const id = this.selectedWorkflowId();
    return id === 'all' ? undefined : this.workflows().find((workflow) => workflow.id === id);
  });

  /**
   * Display names of the repositories the workflows and runs come from.
   *
   * @public
   * @readonly
   */
  public readonly repositoryNames = computed(() => {
    const ids = new Set([
      ...this.workflows().map((workflow) => workflow.repositoryBindingId),
      ...this._ci.runs().map((run) => run.repositoryBindingId),
    ]);
    const repositories = this._context.settings()?.repositoryBindings ?? [];
    return [...ids].map(
      (id) => repositories.find((repository) => repository.id === id)?.displayName ?? id,
    );
  });

  /**
   * Whether any listed workspace runs workflows on the managed local runner.
   *
   * @public
   * @readonly
   */
  public readonly localRunnerAvailable = computed(() =>
    this.workflows().some((workflow) => this._ci.localCiEnabledFor(workflow.workspaceId)),
  );

  /**
   * Running and queued runs across every workflow, before any narrowing.
   *
   * @public
   * @readonly
   */
  public readonly activeRunCount = computed(
    () => this.runRows().filter((row) => isActiveRunStatus(row.status)).length,
  );

  /**
   * Workflows whose dot is red: their latest finished run failed, on GitHub or, when it is the
   * newer verdict, on the managed local runner.
   *
   * @public
   * @readonly
   */
  public readonly failingWorkflowCount = computed(
    () => this.workflowEntries().filter((entry) => entry.health === 'failing').length,
  );

  /**
   * The authors of the runs, for the author filter.
   *
   * @public
   * @readonly
   */
  public readonly actors = computed(() =>
    [
      ...new Set(
        this._ci
          .runs()
          .map((run) => run.actor)
          .filter((actor): actor is string => Boolean(actor)),
      ),
    ].toSorted((left, right) => left.localeCompare(right)),
  );

  /**
   * Status, author and sort menus of the toolbar's filter action.
   *
   * @public
   * @readonly
   */
  public readonly filterMenus = computed(() =>
    resolveActionsListMenus(
      this.actors(),
      this.selectedActor(),
      this.selectedStatus(),
      this.sort(),
    ),
  );

  /**
   * Whether a status or author filter narrows the lists.
   *
   * @public
   * @readonly
   */
  public readonly isFiltered = computed(() =>
    Boolean(this.selectedStatus() || this.selectedActor() || this.searchQuery()),
  );

  /**
   * `Running now` and the visible `History` page of `All runs`.
   *
   * @public
   * @readonly
   */
  public readonly overview = computed(() =>
    projectActionsOverview(this.runRows(), this.filter(), this.sort(), this._historyLimit()),
  );

  /**
   * Runs of the selected workflow in the chosen order.
   *
   * @public
   * @readonly
   */
  public readonly workflowRuns = computed(() => {
    const workflowId = this.selectedWorkflow()?.id;
    if (!workflowId) return [];
    const filter = this.filter();
    const direction = this.sort() === 'started-ascending' ? 1 : -1;
    return this.runRows()
      .filter((row) => row.workflowId === workflowId && matchesActionRunFilter(row, filter))
      .toSorted((left, right) => direction * runTimestamp(left).localeCompare(runTimestamp(right)));
  });

  /**
   * Whether the selected workflow has any run before narrowing.
   *
   * @public
   * @readonly
   */
  public readonly selectedWorkflowHasRuns = computed(() => {
    const workflowId = this.selectedWorkflow()?.id;
    return Boolean(workflowId && this.runRows().some((row) => row.workflowId === workflowId));
  });

  /**
   * The run whose steps, log and diagnosis are shown: the chosen one, the `?run=` link's, or the
   * newest finished run of the workflow.
   *
   * @public
   * @readonly
   */
  public readonly selectedRun = computed<IActionRunRow | undefined>(() => {
    const rows = this.workflowRuns();
    const id = this._selectedRunId() ?? this._queryParamMap().get('run') ?? undefined;
    return (
      rows.find((row) => row.id === id) ??
      rows.find((row) => !isActiveRunStatus(row.status)) ??
      rows[0]
    );
  });

  /**
   * Whether the selected run's details are loading.
   *
   * @public
   * @readonly
   */
  public readonly runDetailsLoading = computed(() => {
    const key = this.detailsKey(this.selectedRun());
    const loaded = this._runDetails();
    return Boolean(key) && (!loaded || loaded.key !== key);
  });

  /**
   * Whether the selected run's details could not be loaded.
   *
   * @public
   * @readonly
   */
  public readonly runDetailsFailed = computed(() => {
    const loaded = this._runDetails();
    return Boolean(loaded?.failed && loaded.key === this.detailsKey(this.selectedRun()));
  });

  /**
   * The selected run's jobs and steps.
   *
   * @public
   * @readonly
   */
  public readonly runSteps = computed(() => {
    const loaded = this._runDetails();
    return loaded && loaded.key === this.detailsKey(this.selectedRun())
      ? buildRunStepRows(loaded.details?.jobs ?? [])
      : [];
  });

  /**
   * The first failed step of the selected run, which a missing diagnosis points at instead.
   *
   * @public
   * @readonly
   */
  public readonly failedStep = computed(() => {
    const failed = this.runSteps().filter((step) => step.status === 'failed');
    return failed.find((step) => step.kind === 'step') ?? failed[0];
  });

  /**
   * The end of the selected run's log: the failure output of a failed run, the live output of a
   * running one.
   *
   * @public
   * @readonly
   */
  public readonly logExcerpt = computed(() => {
    const row = this.selectedRun();
    const loaded = this._runDetails();
    if (!row || row.status === 'succeeded' || row.status === 'cancelled') return undefined;
    const details = loaded && loaded.key === this.detailsKey(row) ? loaded.details : undefined;
    return excerptRunLog(
      row.status === 'failed'
        ? (details?.failureLog ?? row.localExecution?.failureLog ?? details?.logOutput)
        : details?.logOutput,
    );
  });

  /**
   * The AI diagnosis and repair Symphony ran for the selected run.
   *
   * @public
   * @readonly
   */
  public readonly recovery = computed(() =>
    findAgenticRecovery(this._context.snapshot()?.executions ?? [], this.selectedRun()?.run),
  );

  /**
   * Name of the agent that wrote the diagnosis.
   *
   * @public
   * @readonly
   */
  public readonly diagnosisAgentName = computed(() => {
    const agentId = this.recovery().diagnosis?.bindingSnapshot?.agentProfileId;
    return this._context.settings()?.agentProfiles?.find((profile) => profile.id === agentId)
      ?.displayName;
  });

  /**
   * Whether `Fix with AI` can start for the selected run, or why not.
   *
   * @public
   * @readonly
   */
  public readonly fixWithAi = computed(() =>
    resolveFixWithAi({
      run: this.selectedRun()?.run,
      executions: this._context.snapshot()?.executions ?? [],
      policy: this._context.settings()?.runtime?.agenticDelivery,
      operationsAvailable: this._executions !== null,
    }),
  );

  /**
   * Commands one run row offers.
   *
   * @public
   * @readonly
   */
  public readonly runControls = computed(() => {
    const localRunningRunId = this._ci.localCiRunningRunId();
    return (row: IActionRunRow): IActionRunControls =>
      resolveActionRunControls(
        row,
        this._ci.localCiEnabledFor(row.run?.workspaceId),
        localRunningRunId,
      );
  });

  /**
   * Whether this exact workflow start owns the unresolved local-run request: another local run
   * takes the single runner but must not make this workflow's button look busy.
   *
   * @public
   * @readonly
   */
  public readonly localWorkflowDispatchBusy = computed(() => {
    const runningRunId = this._ci.localCiRunningRunId();
    return (workflow: ICiWorkflow): boolean => runningRunId === `workflow:${workflow.id}`;
  });

  /**
   * Whether a workflow's workspace allows the managed local runner.
   *
   * @public
   * @readonly
   */
  public readonly localCiEnabled = computed(
    () => (target: { readonly workspaceId: string }) =>
      this._ci.localCiEnabledFor(target.workspaceId),
  );

  /**
   * The narrowing every run list applies.
   *
   * @public
   * @readonly
   */
  public readonly filter = computed<IActionRunFilter>(() => ({
    ...(this.selectedStatus() ? { status: this.selectedStatus() } : {}),
    ...(this.selectedActor() ? { actor: this.selectedActor() } : {}),
    query: this.searchQuery(),
  }));

  private readonly _refreshCommand = new Command<void>(() => void this.onExecuteRefreshCommand());
  private readonly _selectWorkflowCommand = new Command<'all' | string>(
    (workflowId) => void this.onExecuteSelectWorkflowCommand(workflowId),
  );
  private readonly _selectRunCommand = new Command<IActionRunRow>((row) =>
    this._selectedRunId.set(row.id),
  );
  private readonly _openRunCommand = new Command<IActionRunRow>(
    (row) => void this.onExecuteOpenRunCommand(row),
  );
  private readonly _showOlderRunsCommand = new Command<void>(() =>
    this._historyLimit.update((limit) => limit + HISTORY_PAGE_SIZE),
  );
  private readonly _activateListMenuOptionCommand = new Command<ICollectionListMenuSelection>(
    (selection) => void this.onExecuteActivateListMenuOptionCommand(selection),
  );
  private readonly _viewLogCommand = new Command<IActionRunRow>(
    (row) => void this.onExecuteViewLogCommand(row),
  );
  private readonly _stopRunCommand = new Command<IActionRunRow>(
    (row) => void this.onExecuteStopRunCommand(row),
  );
  private readonly _cancelRunCommand = new Command<IActionRunRow>(
    (row) => void this.onExecuteCancelRunCommand(row),
  );
  private readonly _rerunCommand = new Command<IActionRunRow>(
    (row) => void this.onExecuteRerunCommand(row),
  );
  private readonly _runLocallyCommand = new Command<IActionRunRow>(
    (row) => void this.onExecuteRunLocallyCommand(row),
  );
  private readonly _openInGitHubCommand = new Command<IActionRunRow>((row) =>
    this._externalLinks.open(row.run?.externalUrl),
  );
  private readonly _fixWithAiCommand = new Command<void>(() => void this.onExecuteFixWithAi());
  private readonly _openAutomationSettingsCommand = new Command<void>(
    () =>
      void this._router.navigate(['/main/settings'], { queryParams: { section: 'automation' } }),
  );
  private readonly _openLocalCiSettingsCommand = new Command<string>(
    (workspaceId) =>
      void this._router.navigate(['/main/settings'], {
        queryParams: { workspace: workspaceId, section: 'local-ci' },
      }),
  );
  private readonly _dispatchWorkflowCommand = new Command<ICiWorkflow>(
    (workflow) => void this.onExecuteDispatchWorkflowCommand(workflow),
  );
  private readonly _dispatchWorkflowLocallyCommand = new Command<ICiWorkflow>(
    (workflow) => void this.onExecuteDispatchWorkflowLocallyCommand(workflow),
  );
  private readonly _updateDispatchInputCommand = new Command<readonly [string, string]>(
    ([id, value]) => this.dispatchInputs.update((inputs) => ({ ...inputs, [id]: value })),
  );
  private readonly _confirmDispatchCommand = new Command<void>(
    () => void this.onExecuteConfirmDispatchCommand(),
  );
  private readonly _cancelDispatchCommand = new Command<void>(() =>
    this.dispatchProposal.set(undefined),
  );

  // #endregion

  // #region Ctor

  public constructor() {
    super();
    // Overview's action tiles hand their narrowing over exactly the way the board's do.
    effect(() => {
      const status = this._queryParamMap().get('status');
      this.selectedStatus.set(isRunStatus(status) ? status : undefined);
    });
    // The selected run's steps follow the run: a new run, attempt or state reads them again.
    effect(() => {
      const row = this.selectedRun();
      untracked(() => void this.loadRunDetails(row));
    });
    // `?workflow=<id>&dispatch=github` (the palette's `Run <workflow> on GitHub`) is a one-shot
    // intent: it opens the workflow's dispatch confirmation once the workflow is known, then
    // leaves only the workflow selection in the URL.
    effect(() => {
      const intent = this._queryParamMap().get('dispatch');
      const workflowId = this._queryParamMap().get('workflow');
      const workflows = this.workflows();
      if (intent !== 'github' || !workflowId || !workflows.length) return;
      const workflow = workflows.find((candidate) => candidate.id === workflowId);
      untracked(() => {
        if (workflow) this._dispatchWorkflowCommand.execute(workflow);
        void this._router.navigate([], {
          relativeTo: this._route,
          queryParams: { dispatch: null },
          queryParamsHandling: 'merge',
          replaceUrl: true,
        });
      });
    });
  }

  // #endregion

  // #region Properties

  /** Refreshes workflows and runs from GitHub. @public @readonly */
  public get refreshCommand(): Command<void> {
    return this._refreshCommand;
  }
  /** Selects a workflow, or `all` for `All runs`. @public @readonly */
  public get selectWorkflowCommand(): Command<'all' | string> {
    return this._selectWorkflowCommand;
  }
  /** Selects a run of the selected workflow. @public @readonly */
  public get selectRunCommand(): Command<IActionRunRow> {
    return this._selectRunCommand;
  }
  /** Opens a `History` run in its workflow, or its log when it has no workflow. @public @readonly */
  public get openRunCommand(): Command<IActionRunRow> {
    return this._openRunCommand;
  }
  /** Shows the next page of finished runs. @public @readonly */
  public get showOlderRunsCommand(): Command<void> {
    return this._showOlderRunsCommand;
  }
  /** Applies a filter or sort option. @public @readonly */
  public get activateListMenuOptionCommand(): Command<ICollectionListMenuSelection> {
    return this._activateListMenuOptionCommand;
  }
  /** Opens the Action drawer with jobs, graph and the complete log. @public @readonly */
  public get viewLogCommand(): Command<IActionRunRow> {
    return this._viewLogCommand;
  }
  /** Stops a running run on GitHub or the local runner. @public @readonly */
  public get stopRunCommand(): Command<IActionRunRow> {
    return this._stopRunCommand;
  }
  /** Cancels a queued GitHub run. @public @readonly */
  public get cancelRunCommand(): Command<IActionRunRow> {
    return this._cancelRunCommand;
  }
  /** Reruns a finished run on GitHub. @public @readonly */
  public get rerunCommand(): Command<IActionRunRow> {
    return this._rerunCommand;
  }
  /** Repeats a run on the managed local runner. @public @readonly */
  public get runLocallyCommand(): Command<IActionRunRow> {
    return this._runLocallyCommand;
  }
  /** Opens the run on GitHub. @public @readonly */
  public get openInGitHubCommand(): Command<IActionRunRow> {
    return this._openInGitHubCommand;
  }
  /** Starts an AI revision of the selected failed run's pull request. @public @readonly */
  public get fixWithAiCommand(): Command<void> {
    return this._fixWithAiCommand;
  }
  /** Opens `Fix failed checks` in the Settings window. @public @readonly */
  public get openAutomationSettingsCommand(): Command<void> {
    return this._openAutomationSettingsCommand;
  }
  /** Opens a workspace's `Local GitHub Actions` in the Settings window. @public @readonly */
  public get openLocalCiSettingsCommand(): Command<string> {
    return this._openLocalCiSettingsCommand;
  }
  /** Opens the GitHub dispatch form of a workflow. @public @readonly */
  public get dispatchWorkflowCommand(): Command<ICiWorkflow> {
    return this._dispatchWorkflowCommand;
  }
  /** Runs a workflow on the managed local runner. @public @readonly */
  public get dispatchWorkflowLocallyCommand(): Command<ICiWorkflow> {
    return this._dispatchWorkflowLocallyCommand;
  }
  /** Updates one dispatch input. @public @readonly */
  public get updateDispatchInputCommand(): Command<readonly [string, string]> {
    return this._updateDispatchInputCommand;
  }
  /** Starts the proposed dispatch on GitHub. @public @readonly */
  public get confirmDispatchCommand(): Command<void> {
    return this._confirmDispatchCommand;
  }
  /** Discards the dispatch form. @public @readonly */
  public get cancelDispatchCommand(): Command<void> {
    return this._cancelDispatchCommand;
  }

  // #endregion

  // #region Methods

  /**
   * Loads the workflows and runs.
   *
   * @public
   */
  public override onHydrate(): Promise<void> {
    return hydrateActionsRoute({
      initialize: () => this._bootstrap.initialize(),
      refreshContinuousIntegrationRuns: () => this._ci.refreshContinuousIntegrationRuns(),
    });
  }

  /**
   * Stops the details refresh.
   *
   * @public
   */
  public override dispose(): void {
    if (this._detailsTimer !== undefined) clearTimeout(this._detailsTimer);
    this._detailsTimer = undefined;
    super.dispose();
  }

  private onExecuteRefreshCommand(): Promise<void> {
    return this._ci.refreshContinuousIntegrationRuns(true);
  }

  private onExecuteSelectWorkflowCommand(workflowId: 'all' | string): Promise<boolean> {
    this._selectedRunId.set(undefined);
    this._historyLimit.set(HISTORY_PAGE_SIZE);
    this.dispatchProposal.set(undefined);
    return this._router.navigate([], {
      relativeTo: this._route,
      queryParams: { workflow: workflowId === 'all' ? null : workflowId, run: null },
      queryParamsHandling: 'merge',
    });
  }

  private async onExecuteOpenRunCommand(row: IActionRunRow): Promise<void> {
    const workflowId = row.workflowId;
    if (!workflowId || !this.workflows().some((workflow) => workflow.id === workflowId)) {
      this.onExecuteViewLogCommand(row);
      return;
    }
    await this.onExecuteSelectWorkflowCommand(workflowId);
    this._selectedRunId.set(row.id);
  }

  private onExecuteActivateListMenuOptionCommand(selection: ICollectionListMenuSelection): void {
    const command = resolveActionsListCommand(selection);
    if (!command) return;
    if (command.kind === 'status') this.selectedStatus.set(command.status);
    else if (command.kind === 'actor') this.selectedActor.set(command.actor);
    else this.sort.set(command.sort);
  }

  private onExecuteViewLogCommand(row: IActionRunRow): void {
    if (this._activeDrawer && this._drawers.isShown(this._activeDrawer)) {
      this._activeDrawer.requestAttention();
      return;
    }
    const repository = this._context
      .settings()
      ?.repositoryBindings.find((candidate) => candidate.id === row.run?.repositoryBindingId);
    const drawer = this._drawers.show<IActionDrawerData>(ActionDrawerView, {
      data: { run: toActionDrawerRun(row, repository?.displayName) },
    });
    this._activeDrawer = drawer;
    drawer.closed.subscribe(() => {
      if (this._activeDrawer === drawer) this._activeDrawer = undefined;
    });
  }

  private async onExecuteStopRunCommand(row: IActionRunRow): Promise<void> {
    if (!this.runControls()(row).canStop) return;
    if (row.runningLocally) await this._ci.cancelLocalCiRun(row.id);
    else if (row.run) await this._ci.cancelCiRun(row.run.id);
  }

  private async onExecuteCancelRunCommand(row: IActionRunRow): Promise<void> {
    if (!row.run || !this.runControls()(row).canCancel) return;
    await this._ci.cancelCiRun(row.run.id);
  }

  private async onExecuteRerunCommand(row: IActionRunRow): Promise<void> {
    if (!row.run || !this.runControls()(row).canRerun) return;
    await this._ci.rerunCiRun(row.run.id);
  }

  private async onExecuteRunLocallyCommand(row: IActionRunRow): Promise<void> {
    if (!row.run || !this.runControls()(row).canRunLocally) return;
    await this._ci.runCiLocally(row.run.id);
  }

  private async onExecuteFixWithAi(): Promise<void> {
    const row = this.selectedRun();
    const fix = this.fixWithAi();
    if (!row || !this._executions || this.fixingRunId()) return;
    if (fix.state !== 'available' || !fix.workItemId) return;
    this.fixingRunId.set(row.id);
    try {
      const started = await this._executions.startSolver(
        false,
        fix.workItemId,
        composeFixFeedback(row, this.runSteps(), this.logExcerpt()),
      );
      if (started) {
        this._notifications.showSuccess(
          'AI fix started.',
          `An agent revises the pull request that ${row.workflowName} checked.`,
        );
      }
    } finally {
      this.fixingRunId.set(undefined);
    }
  }

  private onExecuteDispatchWorkflowCommand(workflow: ICiWorkflow): void {
    if (!workflow.supportsManualDispatch || this.dispatchingWorkflowId()) return;
    this.dispatchProposal.set(workflow);
    this.dispatchRef.set(workflow.defaultBranch);
    this.dispatchInputs.set(
      Object.fromEntries(
        (workflow.inputs ?? [])
          .filter((input) => input.defaultValue !== undefined)
          .map((input) => [input.id, input.defaultValue!]),
      ),
    );
  }

  private async onExecuteConfirmDispatchCommand(): Promise<void> {
    const workflow = this.dispatchProposal();
    if (!workflow || this.dispatchingWorkflowId() || !this.dispatchRef().trim()) return;
    this.dispatchingWorkflowId.set(workflow.id);
    try {
      await this._ci.dispatchCiWorkflow(workflow.id, this.dispatchRef(), this.dispatchInputs());
      this.dispatchProposal.set(undefined);
    } finally {
      this.dispatchingWorkflowId.set(undefined);
    }
  }

  private async onExecuteDispatchWorkflowLocallyCommand(workflow: ICiWorkflow): Promise<void> {
    if (!workflow.supportsManualDispatch || this.localRunnerBusy()) return;
    await this._ci.runCiWorkflowLocally(workflow.id, workflow.defaultBranch);
  }

  /** A run's details change with its attempt and its state; the key names that version. */
  private detailsKey(row: IActionRunRow | undefined): string | undefined {
    const run = row?.run;
    return run ? `${run.id}:${run.runAttempt ?? 1}:${row.status}` : undefined;
  }

  private async loadRunDetails(row: IActionRunRow | undefined, force = false): Promise<void> {
    const key = this.detailsKey(row);
    const runId = row?.run?.id;
    if (!key || !runId) return;
    if (!force && this._runDetails()?.key === key) return;
    if (this._detailsTimer !== undefined) clearTimeout(this._detailsTimer);
    this._detailsTimer = undefined;
    let loaded: ISelectedRunDetails;
    try {
      loaded = {
        key,
        details: await this._ci.loadContinuousIntegrationRunDetails(runId),
        failed: false,
      };
    } catch {
      loaded = { key, failed: true };
    }
    if (this.detailsKey(this.selectedRun()) !== key) return;
    this._runDetails.set(loaded);
    if (row && isActiveRunStatus(row.status)) {
      this._detailsTimer = setTimeout(() => {
        this._detailsTimer = undefined;
        void this.loadRunDetails(this.selectedRun(), true);
      }, ACTIVE_DETAILS_REFRESH_MILLISECONDS);
    }
  }

  // #endregion
}

function isRunStatus(value: string | null): value is ICiRun['status'] {
  return Boolean(value) && (RUN_STATUSES as readonly string[]).includes(value as string);
}
