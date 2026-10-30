// #region Imports

import { computed, effect, inject, Injectable, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { DropDownButtonComponent } from '@pixel-brewery/mosaik-elements-angular';
import type { ICiRun, ICiWorkflow } from '@symphony/domain-ci';
import {
  ExternalLinkService,
  Hydratable,
  ViewPresenter,
  Command,
  WorkspaceScopePresenter,
} from '@symphony/frontend-core';
import { ApplicationBootstrap } from '@symphony/frontend-core/bootstrap';
import { RUN_STATUSES } from '@symphony/frontend-core/delivery';
import type { ICollectionListMenuSelection } from '@symphony/frontend-ui';
import {
  type ActionsRunSort,
  resolveActionsListCommand,
  resolveActionsListMenus,
  SORT_MENU_ID,
} from './actionsListPresentation';
import { hydrateActionsRoute } from './routeHydration/hydrateActionsRoute';
import { CiStore } from '../../state/CiStore';

// #endregion

@Injectable()
export class ActionsViewPresenter extends Hydratable(ViewPresenter) {
  // #region Fields

  /**
   * The scope.
   *
   * @public
   * @readonly
   */
  public readonly scope = inject(WorkspaceScopePresenter);
  /** @public */ public readonly dispatchProposal = signal<ICiWorkflow | undefined>(undefined);
  /** @public */ public readonly dispatchRef = signal('');
  /** @public */ public readonly dispatchInputs = signal<Readonly<Record<string, string>>>({});
  private readonly _ci = inject(CiStore);
  private readonly _bootstrap = inject(ApplicationBootstrap);
  private readonly _externalLinks = inject(ExternalLinkService);
  private readonly _route = inject(ActivatedRoute);
  private readonly _queryParamMap = toSignal(this._route.queryParamMap, {
    initialValue: this._route.snapshot.queryParamMap,
  });

  /**
   * The selected workflow ID.
   *
   * @public
   * @readonly
   */
  public readonly selectedWorkflowId = signal<'all' | string>('all');

  /**
   * The dispatching workflow ID.
   *
   * @public
   * @readonly
   */
  public readonly dispatchingWorkflowId = signal<string | undefined>(undefined);

  /**
   * The workflows.
   *
   * @public
   * @readonly
   */
  public readonly workflows = this._ci.workflows;

  /**
   * The runs.
   *
   * @public
   * @readonly
   */
  public readonly runs = this._ci.runs;

  /**
   * The selected workflow.
   *
   * @public
   * @readonly
   */
  public readonly selectedWorkflow = computed(() => {
    const id = this.selectedWorkflowId();
    return id === 'all' ? undefined : this.workflows().find((workflow) => workflow.id === id);
  });

  /**
   * Whether the selected workflow has any recorded runs before list filters are applied.
   *
   * @public
   * @readonly
   */
  public readonly selectedWorkflowHasRuns = computed(() => {
    const selectedWorkflow = this.selectedWorkflow();

    return Boolean(
      selectedWorkflow && this.runs().some((run) => run.workflowId === selectedWorkflow.id),
    );
  });

  /**
   * The selected actor.
   *
   * @public
   * @readonly
   */
  public readonly selectedActor = signal<string | undefined>(undefined);

  /**
   * The selected status.
   *
   * @public
   * @readonly
   */
  public readonly selectedStatus = signal<ICiRun['status'] | undefined>(undefined);

  /**
   * The sort.
   *
   * @public
   * @readonly
   */
  public readonly sort = signal<ActionsRunSort>('started-descending');

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
   * The actors.
   *
   * @public
   * @readonly
   */
  public readonly actors = computed(() =>
    [
      ...new Set(
        this.runs()
          .map((run) => run.actor)
          .filter((actor): actor is string => Boolean(actor)),
      ),
    ].toSorted((left, right) => left.localeCompare(right)),
  );

  /**
   * The list menus.
   *
   * @public
   * @readonly
   */
  public readonly listMenus = computed(() =>
    resolveActionsListMenus(
      this.actors(),
      this.selectedActor(),
      this.selectedStatus(),
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
   * The visible runs.
   *
   * @public
   * @readonly
   */
  public readonly visibleRuns = computed(() => {
    const selectedWorkflowId = this.selectedWorkflowId();
    const selectedStatus = this.selectedStatus();
    const selectedActor = this.selectedActor();
    const searchQuery = this.searchQuery();
    const direction = this.sort() === 'started-ascending' ? 1 : -1;
    return this.runs()
      .filter((run) => selectedWorkflowId === 'all' || run.workflowId === selectedWorkflowId)
      .filter((run) => !selectedStatus || run.status === selectedStatus)
      .filter((run) => !selectedActor || run.actor === selectedActor)
      .filter(
        (run) =>
          !searchQuery ||
          [
            run.name,
            run.title,
            run.actor,
            run.event,
            run.branch,
            run.revision,
            run.status,
            run.runNumber,
          ]
            .join(' ')
            .toLocaleLowerCase()
            .includes(searchQuery),
      )
      .toSorted(
        (left, right) =>
          direction *
          (left.startedAt ?? left.finishedAt ?? '').localeCompare(
            right.startedAt ?? right.finishedAt ?? '',
          ),
      );
  });

  /**
   * The run key.
   *
   * @public
   * @readonly
   */
  public readonly runKey = (run: ICiRun): string => run.id;

  /**
   * The sorted workflows.
   *
   * @public
   * @readonly
   */
  public readonly sortedWorkflows = computed(() =>
    this.workflows().toSorted((left, right) => left.name.localeCompare(right.name)),
  );

  /**
   * Options of the workflow picker: the "All workflows" scope first, then every workflow.
   *
   * @public
   * @readonly
   */
  public readonly workflowOptions = computed<
    readonly { id: string; name: string; isManuallyRunnable: boolean }[]
  >(() => [
    { id: 'all', name: 'All workflows', isManuallyRunnable: false },
    ...this.sortedWorkflows().map((workflow) => ({
      id: workflow.id,
      name: workflow.name,
      isManuallyRunnable: workflow.supportsManualDispatch && workflow.state === 'active',
    })),
  ]);

  /**
   * The remote data.
   *
   * @public
   * @readonly
   */
  public readonly remoteData = this._ci.remoteData;

  /**
   * The local runner busy.
   *
   * @public
   * @readonly
   */
  public readonly localRunnerBusy = computed(() => Boolean(this._ci.localCiRunningRunId()));

  private readonly _localCiEnabled = computed(
    () => (target: { readonly workspaceId: string }) => this.resolveLocalCiEnabled(target),
  );

  private readonly _refreshCommand: Command<void> = new Command(
    () => void this.onExecuteRefreshCommand(),
  );
  private readonly _selectWorkflowCommand: Command<unknown> = new Command(
    (selection) => void this.onExecuteSelectWorkflowCommand(selection),
  );
  private readonly _activateListMenuOptionCommand: Command<ICollectionListMenuSelection> =
    new Command((selection) => void this.onExecuteActivateListMenuOptionCommand(selection));
  private readonly _dispatchWorkflowCommand: Command<ICiWorkflow> = new Command(
    (workflow) => void this.onExecuteDispatchWorkflowCommand(workflow),
  );
  private readonly _dispatchWorkflowLocallyCommand: Command<ICiWorkflow> = new Command(
    (workflow) => void this.onExecuteDispatchWorkflowLocallyCommand(workflow),
  );
  private readonly _openInGitHubCommand: Command<ICiRun> = new Command(
    (run) => void this.onExecuteOpenInGitHubCommand(run),
  );
  private readonly _cancelRemoteRunCommand: Command<ICiRun> = new Command(
    (run) => void this.onExecuteCancelRemoteRunCommand(run),
  );
  private readonly _rerunCommand: Command<ICiRun> = new Command(
    (run) => void this.onExecuteRerunCommand(run),
  );
  private readonly _runLocallyCommand: Command<ICiRun> = new Command(
    (run) => void this.onExecuteRunLocallyCommand(run),
  );
  private readonly _stopLocalRunCommand: Command<ICiRun> = new Command(
    (run) => void this.onExecuteStopLocalRunCommand(run),
  );
  private readonly _isRunningLocally = computed(
    () => (run: ICiRun) => this.resolveIsRunningLocally(run),
  );

  private readonly _openContextActionsCommand: Command<
    readonly [event: MouseEvent, menu: DropDownButtonComponent]
  > = new Command((parameters) => void this.onExecuteOpenContextActionsCommand(...parameters));
  /** @public */ public readonly updateDispatchInputCommand = new Command<
    readonly [string, string]
  >((args) => void this.updateDispatchInput(args[0], args[1]));
  /** @public */ public readonly confirmDispatchCommand = new Command<void>(
    () => void this.confirmDispatch(),
  );
  // #endregion

  // #region Ctor

  public constructor() {
    super();
    // The home mosaic's action tiles hand their narrowing over exactly the way the board's do.
    effect(() => {
      const status = this._queryParamMap().get('status');
      this.selectedStatus.set(isRunStatus(status) ? status : undefined);
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
   * The selectWorkflow command.
   *
   * @public
   * @readonly
   */
  public get selectWorkflowCommand(): Command<unknown> {
    return this._selectWorkflowCommand;
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
   * The dispatchWorkflow command.
   *
   * @public
   * @readonly
   */
  public get dispatchWorkflowCommand(): Command<ICiWorkflow> {
    return this._dispatchWorkflowCommand;
  }
  /**
   * The dispatchWorkflowLocally command.
   *
   * @public
   * @readonly
   */
  public get dispatchWorkflowLocallyCommand(): Command<ICiWorkflow> {
    return this._dispatchWorkflowLocallyCommand;
  }
  /**
   * The openInGitHub command.
   *
   * @public
   * @readonly
   */
  public get openInGitHubCommand(): Command<ICiRun> {
    return this._openInGitHubCommand;
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
   * The rerun command.
   *
   * @public
   * @readonly
   */
  public get rerunCommand(): Command<ICiRun> {
    return this._rerunCommand;
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
   * The isRunningLocally projection.
   *
   * @public
   * @readonly
   */
  public get isRunningLocally() {
    return this._isRunningLocally;
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
   * Local runs belong to the workspace of the run or workflow they act on.
   *
   * @param target - Target.
   * @private
   */
  private resolveLocalCiEnabled(target: { readonly workspaceId: string }): boolean {
    return this._ci.localCiEnabledFor(target.workspaceId);
  }

  /**
   * Whether this exact workflow dispatch owns the unresolved local-run request.
   *
   * A different active local Action consumes the single runner capacity but must not make every
   * workflow button look as if its own click were still loading.
   *
   * @public
   * @readonly
   */
  public readonly localWorkflowDispatchBusy = (workflow: ICiWorkflow): boolean =>
    this._ci.localCiRunningRunId() === `workflow:${workflow.id}`;

  /**
   * Handles hydrate.
   *
   * @public
   */
  public override onHydrate(): Promise<void> {
    return this.loadCurrentActions();
  }

  /**
   * Refreshes.
   *
   * @private
   */
  private onExecuteRefreshCommand(): Promise<void> {
    return this._ci.refreshContinuousIntegrationRuns(true);
  }

  /**
   * Selects the workflow.
   *
   * @param selection - Workflow id or Mosaik selection payload.
   * @private
   */
  private onExecuteSelectWorkflowCommand(selection: unknown): void {
    const workflowId = this.resolveWorkflowId(selection);
    if (!workflowId) return;
    this.selectedWorkflowId.set(workflowId);
  }

  /**
   * Returns the activate list menu option.
   *
   * @param selection - Selection.
   * @private
   */
  private onExecuteActivateListMenuOptionCommand(selection: ICollectionListMenuSelection): void {
    const command = resolveActionsListCommand(selection);
    if (!command) return;
    if (command.kind === 'status') this.selectedStatus.set(command.status);
    else if (command.kind === 'actor') this.selectedActor.set(command.actor);
    else this.sort.set(command.sort);
  }

  /**
   * Dispatches the workflow.
   *
   * @param workflow - Workflow.
   * @private
   */
  private async onExecuteDispatchWorkflowCommand(workflow: ICiWorkflow): Promise<void> {
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

  /** @public */ private updateDispatchInput(id: string, value: string): void {
    this.dispatchInputs.update((inputs) => ({ ...inputs, [id]: value }));
  }
  /** @public */ private async confirmDispatch(): Promise<void> {
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

  /**
   * Dispatches the workflow locally.
   *
   * @param workflow - Workflow.
   * @private
   */
  private async onExecuteDispatchWorkflowLocallyCommand(workflow: ICiWorkflow): Promise<void> {
    if (!workflow.supportsManualDispatch || this.localRunnerBusy()) return;
    await this._ci.runCiWorkflowLocally(workflow.id, workflow.defaultBranch);
  }

  /**
   * Opens the in git hub.
   *
   * @param run - Run.
   * @private
   */
  private onExecuteOpenInGitHubCommand(run: ICiRun): void {
    this._externalLinks.open(run.externalUrl);
  }

  /**
   * Cancels the remote run.
   *
   * @param run - Run.
   * @private
   */
  private async onExecuteCancelRemoteRunCommand(run: ICiRun): Promise<void> {
    await this._ci.cancelCiRun(run.id);
  }

  /**
   * Returns the rerun.
   *
   * @param run - Run.
   * @private
   */
  private async onExecuteRerunCommand(run: ICiRun): Promise<void> {
    await this._ci.rerunCiRun(run.id);
  }

  /**
   * Runs the locally.
   *
   * @param run - Run.
   * @private
   */
  private async onExecuteRunLocallyCommand(run: ICiRun): Promise<void> {
    await this._ci.runCiLocally(run.id);
  }

  /**
   * Stops the local run.
   *
   * @param run - Run.
   * @private
   */
  private async onExecuteStopLocalRunCommand(run: ICiRun): Promise<void> {
    await this._ci.cancelLocalCiRun(run.id);
  }

  /**
   * Whether it is running locally.
   *
   * @param run - Run.
   * @private
   */
  private resolveIsRunningLocally(run: ICiRun): boolean {
    return this._ci.localCiRunningRunId() === run.id;
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

  private async loadCurrentActions(): Promise<void> {
    await hydrateActionsRoute({
      initialize: () => this._bootstrap.initialize(),
      refreshContinuousIntegrationRuns: () => this._ci.refreshContinuousIntegrationRuns(),
    });
  }

  private resolveWorkflowId(selection: unknown): 'all' | string | undefined {
    if (typeof selection === 'string') return selection;
    if (typeof selection !== 'object' || selection === null) return undefined;
    const selectedItem = (selection as { readonly newValue?: unknown }).newValue;
    if (typeof selectedItem !== 'object' || selectedItem === null) return undefined;
    const value = (selectedItem as { readonly value?: unknown }).value;
    return typeof value === 'string' ? value : undefined;
  }

  // #endregion
}

function isRunStatus(value: string | null): value is ICiRun['status'] {
  return Boolean(value) && (RUN_STATUSES as readonly string[]).includes(value as string);
}
