// #region Imports

import { computed, effect, inject, Injectable, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import {
  DrawerService,
  DropDownButtonComponent,
  type IDrawerRef,
} from '@pixel-brewery/mosaik-elements-angular';
import type { ICiRun } from '@symphony/domain-ci';
import type { IPullRequestSummary } from '@symphony/domain-delivery';
import {
  Command,
  ExternalLinkService,
  Hydratable,
  type IPullRequestActionStatus,
  resolvePullRequestActionStatus,
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
import type { ICollectionListMenuSelection } from '@symphony/frontend-ui';
import { PullRequestCreateDrawerView } from '../views/drawers/PullRequestCreateDrawerView';
import {
  BASE_FILTER_LABELS,
  type PullRequestBaseFilter,
  type PullRequestSort,
  resolvePullRequestListCommand,
  resolvePullRequestListMenus,
  SORT_MENU_ID,
} from './pullRequestListPresentation';
import { hydratePullRequestsRoute } from './routeHydration';
import { DELIVERY_VIEW_CONTEXT } from '../ports/DeliveryViewContextToken';
import { DELIVERY_CI_OPERATIONS } from '../ports/DeliveryCiOperationsToken';
import { DELIVERY_ROUTE_HYDRATION } from '../ports/DeliveryRouteHydrationToken';
import { PullRequestStore } from '../state/PullRequestStore';

// #endregion

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
  private readonly _routeHydration = inject(DELIVERY_ROUTE_HYDRATION);
  /** The single Delivery-owned branch-update exclusion signal. @public @readonly */
  public readonly pullRequestBranchUpdatingId = this._pullRequests.pullRequestBranchUpdatingId;
  private readonly _drawerService = inject(DrawerService);
  private readonly _route = inject(ActivatedRoute);
  private readonly _router = inject(Router);
  private readonly _queryParamMap = toSignal(this._route.queryParamMap, {
    initialValue: this._route.snapshot.queryParamMap,
  });
  private _activeDrawer?: IDrawerRef<undefined>;

  /**
   * The pull requests.
   *
   * @public
   * @readonly
   */
  public readonly pullRequests = computed(() => this._context.snapshot()?.pullRequests ?? []);

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
   * The normalized contextual search query.
   *
   * @public
   * @readonly
   */
  public readonly searchQuery = computed(
    () => this._queryParamMap().get('q')?.trim().toLocaleLowerCase() ?? '',
  );

  /**
   * The list menus.
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
   * The filter menus grouped by the Toolbar filter action.
   *
   * @public
   * @readonly
   */
  public readonly filterMenus = computed(() =>
    this.listMenus().filter((menu) => menu.id !== SORT_MENU_ID),
  );

  /**
   * The non-filter menus retained by the collection header.
   *
   * @public
   * @readonly
   */
  public readonly sortMenus = computed(() =>
    this.listMenus().filter((menu) => menu.id === SORT_MENU_ID),
  );

  /**
   * The pull request key.
   *
   * @public
   * @readonly
   */
  public readonly pullRequestKey = (pullRequest: IPullRequestSummary): string => pullRequest.id;

  /**
   * The visible pull requests.
   *
   * @public
   * @readonly
   */
  public readonly visiblePullRequests = computed(() => {
    const selectedAuthor = this.selectedAuthor();
    const selectedState = this.selectedState();
    const selectedBase = this.selectedBase();
    const searchQuery = this.searchQuery();
    const pullRequests = this.pullRequests().filter(
      (pullRequest) =>
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
    return pullRequests.toSorted((left, right) => {
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

  private readonly _actionStatus = computed(
    () => (pullRequest: IPullRequestSummary) => this.resolveActionStatus(pullRequest),
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
   * The run projection.
   *
   * @public
   * @readonly
   */
  public get run() {
    return this._run;
  }
  /**
   * The actionStatus projection.
   *
   * @public
   * @readonly
   */
  public get actionStatus() {
    return this._actionStatus;
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
   * Refreshes.
   *
   * @private
   */
  private async onExecuteRefreshCommand(): Promise<void> {
    await this.loadCurrentPullRequests();
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
   * Returns the action status.
   *
   * @param pullRequest - Pull request.
   * @private
   */
  private resolveActionStatus(
    pullRequest: IPullRequestSummary,
  ): IPullRequestActionStatus | undefined {
    const runId = this._ci?.localCiRunningRunId();
    const startedAt = this._ci?.localCiStartedAt();
    return resolvePullRequestActionStatus(
      pullRequest,
      this._context.snapshot()?.ciRuns ?? [],
      this._context.snapshot()?.localCiExecutions ?? [],
      runId && startedAt ? { runId, startedAt } : undefined,
    );
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
   * Opens the authoring drawer; a second request raises the drawer that is already open.
   *
   * @private
   */
  private onExecuteCreatePullRequestCommand(): void {
    if (!this.canCreatePullRequest()) return;
    if (this._activeDrawer && this._drawerService.isShown(this._activeDrawer)) {
      this._activeDrawer.requestAttention();
      return;
    }
    const drawer = this._drawerService.show<undefined>(PullRequestCreateDrawerView);
    this._activeDrawer = drawer;
    drawer.closed.subscribe(() => {
      if (this._activeDrawer === drawer) this._activeDrawer = undefined;
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
