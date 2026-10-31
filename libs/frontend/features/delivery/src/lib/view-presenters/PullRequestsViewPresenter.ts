// #region Imports

import { computed, effect, inject, Injectable, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import {
  DialogService,
  DropDownButtonComponent,
  type IDialogRef,
} from '@pixel-brewery/mosaik-elements-angular';
import type { ICiRun } from '@symphony/domain-ci';
import type { IPullRequestSummary } from '@symphony/domain-delivery';
import {
  Clock,
  Command,
  ExternalLinkService,
  Hydratable,
  resolvePullRequestRun,
  ViewPresenter,
  WorkspaceScopePresenter,
  watchCreateIntent,
} from '@symphony/frontend-core';
import {
  PULL_REQUEST_STATES,
  type PullRequestState,
  pullRequestStateOf,
} from '@symphony/frontend-core/delivery';
import { EXECUTION_OPERATIONS } from '@symphony/frontend-core/execution';
import type { ICollectionListMenuSelection } from '@symphony/frontend-ui';
import { PullRequestCreateDrawerView } from '../views/drawers/PullRequestCreateDrawerView';
import {
  BASE_FILTER_LABELS,
  type PullRequestBaseFilter,
  type PullRequestSort,
  resolvePullRequestListCommand,
  resolvePullRequestListMenus,
} from './pullRequestListPresentation';
import {
  composePullRequestRepairRequest,
  type IPullRequestRow,
  isPullRequestInSegment,
  PULL_REQUEST_SEGMENTS,
  type PullRequestRepairBlock,
  type PullRequestSegment,
  resolvePullRequestChecks,
  resolvePullRequestDelivery,
  resolvePullRequestRepairBlock,
  resolvePullRequestRow,
} from './pullRequestRowPresentation';
import { hydratePullRequestsRoute } from './routeHydration';
import { DELIVERY_VIEW_CONTEXT } from '../ports/DeliveryViewContextToken';
import { DELIVERY_CI_OPERATIONS } from '../ports/DeliveryCiOperationsToken';
import { DELIVERY_ROUTE_HYDRATION } from '../ports/DeliveryRouteHydrationToken';
import { PullRequestStore } from '../state/PullRequestStore';

// #endregion

const SHEET_MAX_HEIGHT = '86dvh';

/**
 * State and commands of the `Pull requests` screen: the segmented, filterable table of open pull
 * requests and the inspector of the selected one.
 *
 * Query parameters: `view` selects the segment (`needs-action`, `drafts`; `open` by default),
 * `pullRequest` selects the inspected pull request, `state` and `base` narrow the list the way the
 * Overview tiles hand them over, `q` is the contextual search and `create=true` opens the authoring
 * drawer.
 *
 * @public
 */
@Injectable()
export class PullRequestsViewPresenter extends Hydratable(ViewPresenter) {
  // #region Fields

  /**
   * The scope.
   *
   * @public
   * @readonly
   */
  public readonly scope = inject(WorkspaceScopePresenter);
  private readonly _externalLinks = inject(ExternalLinkService);
  private readonly _pullRequests = inject(PullRequestStore);
  private readonly _context = inject(DELIVERY_VIEW_CONTEXT);
  private readonly _ci = inject(DELIVERY_CI_OPERATIONS);
  private readonly _execution = inject(EXECUTION_OPERATIONS, { optional: true });
  private readonly _routeHydration = inject(DELIVERY_ROUTE_HYDRATION);
  /** The single Delivery-owned branch-update exclusion signal. @public @readonly */
  public readonly pullRequestBranchUpdatingId = this._pullRequests.pullRequestBranchUpdatingId;
  private readonly _dialogService = inject(DialogService);
  private readonly _route = inject(ActivatedRoute);
  private readonly _router = inject(Router);
  private readonly _queryParamMap = toSignal(this._route.queryParamMap, {
    initialValue: this._route.snapshot.queryParamMap,
  });
  private _activeSheet?: IDialogRef<undefined>;

  /**
   * Current time for the relative `Updated` column, ticking with the shared clock.
   *
   * @public
   * @readonly
   */
  public readonly now = inject(Clock).now;

  /**
   * The pull requests.
   *
   * @public
   * @readonly
   */
  public readonly pullRequests = computed(() => this._context.snapshot()?.pullRequests ?? []);

  /**
   * Enabled GitHub repositories of the selected workspaces, named in the toolbar subtitle.
   *
   * @public
   * @readonly
   */
  public readonly repositories = computed(() => {
    const workspaceIds = new Set(this._context.selectedWorkspaceIds());
    return (this._context.settings()?.repositoryBindings ?? []).filter(
      (repository) =>
        repository.enabled &&
        repository.provider === 'github' &&
        workspaceIds.has(repository.workspaceId),
    );
  });

  /**
   * The authors.
   *
   * @public
   * @readonly
   */
  public readonly authors = computed(() =>
    [
      ...new Set(
        this.pullRequests()
          .map((pullRequest) => pullRequest.author)
          .filter((author): author is string => Boolean(author)),
      ),
    ].toSorted((left, right) => left.localeCompare(right)),
  );

  /**
   * The selected author.
   *
   * @public
   * @readonly
   */
  public readonly selectedAuthor = signal<string | undefined>(undefined);

  /**
   * State the list is narrowed to; the home mosaic's pull-request tiles land here.
   *
   * @public
   * @readonly
   */
  public readonly selectedState = signal<PullRequestState | undefined>(undefined);

  /**
   * Base-branch status the list is narrowed to; an axis orthogonal to the state.
   *
   * @public
   * @readonly
   */
  public readonly selectedBase = signal<PullRequestBaseFilter | undefined>(undefined);

  /**
   * The sort.
   *
   * @public
   * @readonly
   */
  public readonly sort = signal<PullRequestSort>('updated-descending');

  /**
   * The segment the table is narrowed to.
   *
   * @public
   * @readonly
   */
  public readonly segment = signal<PullRequestSegment>('open');

  /**
   * Every segment in display order.
   *
   * @public
   * @readonly
   */
  public readonly segments = PULL_REQUEST_SEGMENTS;

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
   * The State, Base, Author and Sort menus of the filter action.
   *
   * @public
   * @readonly
   */
  public readonly listMenus = computed(() =>
    resolvePullRequestListMenus(
      this.authors(),
      this.selectedAuthor(),
      this.selectedState(),
      this.selectedBase(),
      this.sort(),
    ),
  );

  /**
   * Whether any filter or the contextual search narrows the list.
   *
   * @public
   * @readonly
   */
  public readonly hasActiveFilters = computed(
    () =>
      Boolean(this.selectedAuthor()) ||
      Boolean(this.selectedState()) ||
      Boolean(this.selectedBase()) ||
      Boolean(this.searchQuery()),
  );

  /**
   * The local runner busy.
   *
   * @public
   * @readonly
   */
  public readonly localRunnerBusy = computed(() => Boolean(this._ci?.localCiRunningRunId()));

  /**
   * The remote data.
   *
   * @public
   * @readonly
   */
  public readonly remoteData = computed(() => this._context.snapshot()?.remoteData?.pullRequests);

  /**
   * Only GitHub repositories in the selected workspaces can receive a new pull request.
   *
   * @public
   * @readonly
   */
  public readonly canCreatePullRequest = this._context.canCreatePullRequest;

  /**
   * Whether a refresh started from this screen is running.
   *
   * @public
   * @readonly
   */
  public readonly isRefreshing = signal(false);

  /**
   * Pull request whose AI repair is being requested.
   *
   * @public
   * @readonly
   */
  public readonly repairingPullRequestId = signal<string | undefined>(undefined);

  /**
   * Every pull request in scope with its checks, merge state and delivery.
   *
   * @public
   * @readonly
   */
  public readonly rows = computed<readonly IPullRequestRow[]>(() => {
    const snapshot = this._context.snapshot();
    const settings = this._context.settings();
    const runId = this._ci?.localCiRunningRunId();
    const startedAt = this._ci?.localCiStartedAt();
    const activeLocalRun = runId && startedAt ? { runId, startedAt } : undefined;
    return this.pullRequests().map((pullRequest) =>
      resolvePullRequestRow(
        pullRequest,
        this._ci
          ? resolvePullRequestChecks(
              pullRequest,
              snapshot?.ciRuns ?? [],
              snapshot?.localCiExecutions ?? [],
              activeLocalRun,
            )
          : [],
        resolvePullRequestDelivery(
          pullRequest,
          snapshot?.executions ?? [],
          snapshot?.workItems ?? [],
          settings?.agentProfiles ?? [],
        ),
      ),
    );
  });

  /**
   * Number of pull requests in each segment.
   *
   * @public
   * @readonly
   */
  public readonly segmentCounts = computed<Readonly<Record<PullRequestSegment, number>>>(() => {
    const rows = this.rows();
    return {
      open: rows.filter((row) => isPullRequestInSegment(row, 'open')).length,
      'needs-action': rows.filter((row) => isPullRequestInSegment(row, 'needs-action')).length,
      drafts: rows.filter((row) => isPullRequestInSegment(row, 'drafts')).length,
    };
  });

  /**
   * The rows of the selected segment that match every filter, in the selected order.
   *
   * @public
   * @readonly
   */
  public readonly visibleRows = computed<readonly IPullRequestRow[]>(() => {
    const segment = this.segment();
    const selectedAuthor = this.selectedAuthor();
    const selectedState = this.selectedState();
    const selectedBase = this.selectedBase();
    const searchQuery = this.searchQuery();
    const rows = this.rows().filter(
      ({ pullRequest, needsAction }) =>
        isPullRequestInSegment({ pullRequest, needsAction }, segment) &&
        (!selectedAuthor || pullRequest.author === selectedAuthor) &&
        (!selectedState || pullRequestStateOf(pullRequest) === selectedState) &&
        (!selectedBase || pullRequest.baseBranchStatus === selectedBase) &&
        (!searchQuery ||
          [
            pullRequest.number,
            pullRequest.title,
            pullRequest.author,
            pullRequest.sourceBranch,
            pullRequest.targetBranch,
            pullRequest.state,
          ]
            .join(' ')
            .toLocaleLowerCase()
            .includes(searchQuery)),
    );
    return rows.toSorted(({ pullRequest: left }, { pullRequest: right }) => {
      switch (this.sort()) {
        case 'created-ascending':
          return left.createdAt.localeCompare(right.createdAt);
        case 'created-descending':
          return right.createdAt.localeCompare(left.createdAt);
        case 'updated-descending':
          return right.updatedAt.localeCompare(left.updatedAt);
      }
    });
  });

  /**
   * The pull request the operator selected; the inspector falls back to the first visible row.
   *
   * @public
   * @readonly
   */
  public readonly selectedPullRequestId = signal<string | undefined>(undefined);

  /**
   * The row the inspector shows: the selected one while it is visible, otherwise the first one.
   *
   * @public
   * @readonly
   */
  public readonly selectedRow = computed<IPullRequestRow | undefined>(() => {
    const rows = this.visibleRows();
    const id = this.selectedPullRequestId();
    return rows.find((row) => row.pullRequest.id === id) ?? rows[0];
  });

  /**
   * Repository of the inspected pull request.
   *
   * @public
   * @readonly
   */
  public readonly selectedRepository = computed(() => {
    const repositoryBindingId = this.selectedRow()?.pullRequest.repositoryBindingId;
    return this._context
      .settings()
      ?.repositoryBindings.find((repository) => repository.id === repositoryBindingId);
  });

  /**
   * Why `Repair with AI` cannot start for the inspected pull request, or `undefined` when it can.
   *
   * @public
   * @readonly
   */
  public readonly repairBlock = computed<PullRequestRepairBlock | undefined>(() => {
    const row = this.selectedRow();
    if (!row) return undefined;
    const settings = this._context.settings();
    return resolvePullRequestRepairBlock(
      row.pullRequest,
      row.delivery,
      settings?.runtime?.agenticDelivery,
      settings?.ciBindings ?? [],
      this._execution !== null,
    );
  });

  /**
   * The run `Run checks locally` acts on for the inspected pull request: its first failed check,
   * otherwise its newest run.
   *
   * @public
   * @readonly
   */
  public readonly selectedChecksRun = computed<ICiRun | undefined>(() => {
    const row = this.selectedRow();
    if (!row) return undefined;
    return (
      row.checks.find((check) => check.state === 'failed')?.run ?? this.resolveRun(row.pullRequest)
    );
  });

  /**
   * Resets every pull-request narrowing while preserving the workspace scope and sort order.
   *
   * @public
   * @readonly
   */
  public readonly resetFiltersCommand: Command<void> = new Command(() => {
    void this.resetFilters();
  });

  private readonly _localCiEnabled = computed(
    () => (run: { readonly workspaceId: string }) => this.resolveLocalCiEnabled(run),
  );

  private readonly _refreshCommand: Command<void> = new Command(
    () => void this.onExecuteRefreshCommand(),
  );
  private readonly _activateListMenuOptionCommand: Command<ICollectionListMenuSelection> =
    new Command((selection) => void this.onExecuteActivateListMenuOptionCommand(selection));
  private readonly _run = computed(
    () => (pullRequest: IPullRequestSummary) => this.resolveRun(pullRequest),
  );
  private readonly _selectSegmentCommand: Command<PullRequestSegment> = new Command(
    (segment) => void this.onExecuteSelectSegmentCommand(segment),
  );
  private readonly _selectPullRequestCommand: Command<string> = new Command((id) =>
    this.selectedPullRequestId.set(id),
  );
  private readonly _openWorkItemCommand: Command<string> = new Command(
    (workItemId) => void this.onExecuteOpenWorkItemCommand(workItemId),
  );
  private readonly _repairWithAiCommand: Command<IPullRequestRow> = new Command(
    (row) => void this.onExecuteRepairWithAiCommand(row),
  );

  private readonly _openInGitHubCommand: Command<IPullRequestSummary> = new Command(
    (pullRequest) => void this.onExecuteOpenInGitHubCommand(pullRequest),
  );
  private readonly _isRunningLocally = computed(
    () => (run: ICiRun) => this.resolveIsRunningLocally(run),
  );

  private readonly _runRemotelyCommand: Command<ICiRun> = new Command(
    (run) => void this.onExecuteRunRemotelyCommand(run),
  );
  private readonly _runLocallyCommand: Command<ICiRun> = new Command(
    (run) => void this.onExecuteRunLocallyCommand(run),
  );
  private readonly _stopLocalRunCommand: Command<ICiRun> = new Command(
    (run) => void this.onExecuteStopLocalRunCommand(run),
  );
  private readonly _cancelRemoteRunCommand: Command<ICiRun> = new Command(
    (run) => void this.onExecuteCancelRemoteRunCommand(run),
  );
  private readonly _createPullRequestCommand: Command<void> = new Command(
    () => void this.onExecuteCreatePullRequestCommand(),
  );
  private readonly _openContextActionsCommand: Command<
    readonly [event: MouseEvent, menu: DropDownButtonComponent]
  > = new Command((parameters) => void this.onExecuteOpenContextActionsCommand(...parameters));
  // #endregion

  // #region Ctor

  public constructor() {
    super();
    watchCreateIntent(() => this.onExecuteCreatePullRequestCommand());
    // The home mosaic's tiles hand their narrowing over exactly the way the board's do.
    effect(() => {
      const state = this._queryParamMap().get('state');
      this.selectedState.set(isPullRequestState(state) ? state : undefined);
    });
    effect(() => {
      const base = this._queryParamMap().get('base');
      this.selectedBase.set(isPullRequestBaseFilter(base) ? base : undefined);
    });
    effect(() => {
      const view = this._queryParamMap().get('view');
      this.segment.set(isPullRequestSegment(view) ? view : 'open');
    });
    effect(() => {
      const pullRequest = this._queryParamMap().get('pullRequest');
      if (pullRequest) this.selectedPullRequestId.set(pullRequest);
    });
  }

  // #endregion

  // #region Properties

  /**
   * The localCiEnabled projection.
   *
   * @public
   * @readonly
   */
  public get localCiEnabled() {
    return this._localCiEnabled;
  }
  /**
   * The refresh command.
   *
   * @public
   * @readonly
   */
  public get refreshCommand(): Command<void> {
    return this._refreshCommand;
  }
  /**
   * The activateListMenuOption command.
   *
   * @public
   * @readonly
   */
  public get activateListMenuOptionCommand(): Command<ICollectionListMenuSelection> {
    return this._activateListMenuOptionCommand;
  }
  /**
   * The run projection: the newest workflow run of a pull request's branch.
   *
   * @public
   * @readonly
   */
  public get run() {
    return this._run;
  }
  /**
   * Selects a segment and keeps it in the `view` query parameter.
   *
   * @public
   * @readonly
   */
  public get selectSegmentCommand(): Command<PullRequestSegment> {
    return this._selectSegmentCommand;
  }
  /**
   * Selects the pull request the inspector shows.
   *
   * @public
   * @readonly
   */
  public get selectPullRequestCommand(): Command<string> {
    return this._selectPullRequestCommand;
  }
  /**
   * Opens the work item a pull request delivers on the Board.
   *
   * @public
   * @readonly
   */
  public get openWorkItemCommand(): Command<string> {
    return this._openWorkItemCommand;
  }
  /**
   * Asks the Solver to repair the failed checks of a pull request on its retained branch.
   *
   * @public
   * @readonly
   */
  public get repairWithAiCommand(): Command<IPullRequestRow> {
    return this._repairWithAiCommand;
  }
  /**
   * The openInGitHub command.
   *
   * @public
   * @readonly
   */
  public get openInGitHubCommand(): Command<IPullRequestSummary> {
    return this._openInGitHubCommand;
  }
  /**
   * The isRunningLocally projection.
   *
   * @public
   * @readonly
   */
  public get isRunningLocally() {
    return this._isRunningLocally;
  }
  /**
   * The runRemotely command.
   *
   * @public
   * @readonly
   */
  public get runRemotelyCommand(): Command<ICiRun> {
    return this._runRemotelyCommand;
  }
  /**
   * The runLocally command.
   *
   * @public
   * @readonly
   */
  public get runLocallyCommand(): Command<ICiRun> {
    return this._runLocallyCommand;
  }
  /**
   * The stopLocalRun command.
   *
   * @public
   * @readonly
   */
  public get stopLocalRunCommand(): Command<ICiRun> {
    return this._stopLocalRunCommand;
  }
  /**
   * The cancelRemoteRun command.
   *
   * @public
   * @readonly
   */
  public get cancelRemoteRunCommand(): Command<ICiRun> {
    return this._cancelRemoteRunCommand;
  }
  /**
   * The createPullRequest command.
   *
   * @public
   * @readonly
   */
  public get createPullRequestCommand(): Command<void> {
    return this._createPullRequestCommand;
  }
  /**
   * The openContextActions command.
   *
   * @public
   * @readonly
   */
  public get openContextActionsCommand(): Command<
    readonly [event: MouseEvent, menu: DropDownButtonComponent]
  > {
    return this._openContextActionsCommand;
  }
  // #endregion

  // #region Methods

  /**
   * Local runs belong to the workspace of the run they act on.
   *
   * @param run - Run.
   * @private
   */
  private resolveLocalCiEnabled(run: { readonly workspaceId: string }): boolean {
    return this._ci?.localCiEnabledFor(run.workspaceId) ?? false;
  }

  /**
   * Handles hydrate.
   *
   * @public
   */
  public override onHydrate(): Promise<void> {
    return this.loadCurrentPullRequests();
  }

  /**
   * Refreshes the pull requests and their workflow runs.
   *
   * @private
   */
  private async onExecuteRefreshCommand(): Promise<void> {
    if (this.isRefreshing()) return;
    this.isRefreshing.set(true);
    try {
      await this.loadCurrentPullRequests();
    } finally {
      this.isRefreshing.set(false);
    }
  }

  /**
   * Selects the state.
   *
   * @param state - State.
   * @public
   * @readonly
   */
  public readonly selectState = (state: PullRequestState | undefined): void => {
    this.selectedState.set(state);
  };

  /**
   * Selects the base-branch status.
   *
   * @public
   * @readonly
   */
  public readonly selectBase = (base: PullRequestBaseFilter | undefined): void => {
    this.selectedBase.set(base);
  };

  /**
   * Selects the author.
   *
   * @param author - Author.
   * @private
   */
  private selectAuthor(author: string | undefined): void {
    this.selectedAuthor.set(author);
  }

  /**
   * Sets the sort.
   *
   * @param sort - Sort.
   * @private
   */
  private setSort(sort: PullRequestSort): void {
    this.sort.set(sort);
  }

  /**
   * Returns the activate list menu option.
   *
   * @param selection - Selection.
   * @private
   */
  private onExecuteActivateListMenuOptionCommand(selection: ICollectionListMenuSelection): void {
    const command = resolvePullRequestListCommand(selection);
    if (!command) return;
    if (command.kind === 'author') this.selectAuthor(command.author);
    else if (command.kind === 'state') this.selectedState.set(command.state);
    else if (command.kind === 'base') this.selectedBase.set(command.base);
    else this.setSort(command.sort);
  }

  /**
   * Selects a segment; the `view` query parameter keeps it across back and forward.
   *
   * @param segment - Segment.
   * @private
   */
  private async onExecuteSelectSegmentCommand(segment: PullRequestSegment): Promise<void> {
    this.segment.set(segment);
    await this._router.navigate([], {
      relativeTo: this._route,
      queryParams: { view: segment === 'open' ? null : segment },
      queryParamsHandling: 'merge',
    });
  }

  /**
   * Opens the work item on the Board.
   *
   * @param workItemId - Work item id.
   * @private
   */
  private async onExecuteOpenWorkItemCommand(workItemId: string): Promise<void> {
    await this._router.navigate(['/main/board'], { queryParams: { item: workItemId } });
  }

  /**
   * Starts an AI revision of the delivered work item that repairs the failed checks on the retained
   * branch, but only where the automation policy allows AI to repair failed checks.
   *
   * @param row - Row.
   * @private
   */
  private async onExecuteRepairWithAiCommand(row: IPullRequestRow): Promise<void> {
    const workItemId = row.delivery.workItemId;
    if (!this._execution || !workItemId || this.repairingPullRequestId()) return;
    if (row.checksSummary.state !== 'failing') return;
    const settings = this._context.settings();
    const block = resolvePullRequestRepairBlock(
      row.pullRequest,
      row.delivery,
      settings?.runtime?.agenticDelivery,
      settings?.ciBindings ?? [],
      true,
    );
    if (block) return;
    this.repairingPullRequestId.set(row.pullRequest.id);
    try {
      await this._execution.startSolver(
        false,
        workItemId,
        composePullRequestRepairRequest(row.pullRequest, row.checksSummary),
      );
    } finally {
      this.repairingPullRequestId.set(undefined);
    }
  }

  /**
   * Runs.
   *
   * @param pullRequest - Pull request.
   * @private
   */
  private resolveRun(pullRequest: IPullRequestSummary): ICiRun | undefined {
    if (!this._ci) return undefined;
    return resolvePullRequestRun(pullRequest, this._context.snapshot()?.ciRuns ?? []);
  }

  /**
   * Opens the in git hub.
   *
   * @param pullRequest - Pull request.
   * @private
   */
  private onExecuteOpenInGitHubCommand(pullRequest: IPullRequestSummary): void {
    this._externalLinks.open(pullRequest.externalUrl);
  }

  /**
   * Whether the pull-request branch is being updated.
   *
   * @public
   * @readonly
   */
  public readonly branchUpdating = (pullRequest: IPullRequestSummary): boolean =>
    this._pullRequests.pullRequestBranchUpdatingId() === pullRequest.id;

  /**
   * Updates the pull-request branch.
   *
   * @public
   * @readonly
   */
  public readonly updateBranch = async (pullRequest: IPullRequestSummary): Promise<void> => {
    await this._pullRequests.updatePullRequestBranch(pullRequest);
  };

  /**
   * Whether it is running locally.
   *
   * @param run - Run.
   * @private
   */
  private resolveIsRunningLocally(run: ICiRun): boolean {
    return this._ci?.localCiRunningRunId() === run.id;
  }

  /**
   * Runs the remotely.
   *
   * @param run - Run.
   * @private
   */
  private async onExecuteRunRemotelyCommand(run: ICiRun): Promise<void> {
    if (run.status === 'queued' || run.status === 'in-progress') return;
    await this._ci?.rerunCiRun(run.id);
  }

  /**
   * Runs the locally.
   *
   * @param run - Run.
   * @private
   */
  private async onExecuteRunLocallyCommand(run: ICiRun): Promise<void> {
    await this._ci?.runCiLocally(run.id);
  }

  /**
   * Stops the local run.
   *
   * @param run - Run.
   * @private
   */
  private async onExecuteStopLocalRunCommand(run: ICiRun): Promise<void> {
    await this._ci?.cancelLocalCiRun(run.id);
  }

  /**
   * Cancels the remote run.
   *
   * @param run - Run.
   * @private
   */
  private async onExecuteCancelRemoteRunCommand(run: ICiRun): Promise<void> {
    await this._ci?.cancelCiRun(run.id);
  }

  /**
   * Opens the `New pull request` sheet; a second request draws attention to the sheet that is
   * already open. A stray click beside the sheet keeps what was typed; Escape and `Cancel` close it.
   *
   * @private
   */
  private onExecuteCreatePullRequestCommand(): void {
    if (!this.canCreatePullRequest()) return;
    if (this._activeSheet && this._dialogService.isShown(this._activeSheet)) {
      void this._activeSheet.requestAttention();
      return;
    }
    const sheet = this._dialogService.show<undefined>(PullRequestCreateDrawerView, {
      hasBackdrop: true,
      backdropStrategy: 'own',
      clickOutsideToClose: false,
      pressEscapeToClose: true,
      size: { width: '640px' },
      maxSize: { width: '100vw', height: SHEET_MAX_HEIGHT },
    });
    // `maxSize` caps only the overlay pane; the dialog surface follows its own public
    // `--dialog-max-height`. Without it the sheet outgrows a short window, and its header, the
    // Draft switch and the create button leave the screen; capped, its content scrolls.
    sheet.element.style.setProperty('--dialog-max-height', SHEET_MAX_HEIGHT);
    this._activeSheet = sheet;
    sheet.closed.subscribe(() => {
      if (this._activeSheet === sheet) this._activeSheet = undefined;
    });
  }

  /**
   * Opens the context actions.
   *
   * @param event - Event.
   * @param menu - Menu.
   * @private
   */
  private onExecuteOpenContextActionsCommand(
    event: MouseEvent,
    menu: DropDownButtonComponent,
  ): void {
    event.preventDefault();
    event.stopPropagation();
    menu.invoke('open');
  }

  private async resetFilters(): Promise<void> {
    this.selectedAuthor.set(undefined);
    this.selectedState.set(undefined);
    this.selectedBase.set(undefined);
    await this._router.navigate([], {
      relativeTo: this._route,
      queryParams: { q: null, state: null, base: null },
      queryParamsHandling: 'merge',
    });
  }

  private async loadCurrentPullRequests(): Promise<void> {
    await hydratePullRequestsRoute(this._routeHydration);
  }

  // #endregion
}

function isPullRequestState(value: string | null): value is PullRequestState {
  return Boolean(value) && (PULL_REQUEST_STATES as readonly string[]).includes(value as string);
}

function isPullRequestBaseFilter(value: string | null): value is PullRequestBaseFilter {
  return value !== null && value in BASE_FILTER_LABELS;
}

function isPullRequestSegment(value: string | null): value is PullRequestSegment {
  return value !== null && (PULL_REQUEST_SEGMENTS as readonly string[]).includes(value);
}
