// #region Imports

import { computed, DestroyRef, effect, inject, Injectable, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import { DrawerService, THEME, type IDrawerRef } from '@pixel-brewery/mosaik-elements-angular';
import { type IExecutionRecord } from '@symphony/domain-execution';
import { browserStorage, Command, NavigationRegistry } from '@symphony/frontend-core';
import { NotificationService } from '@symphony/frontend-notification';
import { SearchManager } from '@symphony/frontend-search';
import { filter } from 'rxjs';
import {
  ActionDrawerView,
  type IActionDrawerData,
} from '@symphony/frontend-feature-ci/presentation';
import { ExecutionDrawerView } from '@symphony/frontend-feature-execution';
import { type IExecutionDrawerData } from '@symphony/frontend-feature-execution';
import { buildRailRuns, type IRailRun } from '@symphony/frontend-feature-execution/projections';
import { shouldShowActionsRemoteDataNotice } from './shouldShowActionsRemoteDataNotice';
import { DesktopUpdateStore } from '@symphony/frontend-update';
import { DesktopSpeechRecognitionService } from '@symphony/frontend-interaction';
import { PRESENTATION_CONTEXT } from '../ports/PresentationContextToken';

// #endregion

const RAIL_OPEN_STORAGE_KEY = 'presentation.isRailOpen';
type RailView = 'agent-runs' | 'actions';

@Injectable()
export class PresenterViewPresenter {
  // #region Fields

  private readonly _router = inject(Router);
  private readonly _destroyRef = inject(DestroyRef);
  private readonly _store = inject(PRESENTATION_CONTEXT);
  private readonly _navigation = inject(NavigationRegistry);
  private readonly _search = inject(SearchManager);
  private readonly _drawerService = inject(DrawerService);
  private readonly _notifications = inject(NotificationService);
  private readonly _speechRecognition = inject(DesktopSpeechRecognitionService);
  private readonly _routeState = signal(this._router.url);
  private _activeExecutionDrawer?: IDrawerRef<IExecutionDrawerData>;
  private _openedRunLink = '';
  private _activeActionDrawer?: IDrawerRef<IActionDrawerData>;

  /**
   * The theme.
   *
   * @public
   * @readonly
   */
  public readonly theme = inject(THEME);

  /**
   * Desktop update state shared with Settings and the menu-bar surface.
   *
   * @public
   * @readonly
   */
  public readonly updates = inject(DesktopUpdateStore);

  /**
   * Whether it is rail open.
   *
   * @public
   * @readonly
   */
  public readonly isRailOpen = signal(
    (this._store.executionAvailable || this._store.ciAvailable) &&
      (readStoredBoolean(RAIL_OPEN_STORAGE_KEY) ?? false),
  );

  /**
   * Whether it is voice input active.
   *
   * @public
   * @readonly
   */
  public readonly isVoiceInputActive = signal(false);

  /**
   * The search query.
   *
   * @public
   * @readonly
   */
  public readonly searchQuery = signal('');

  /**
   * Whether the global search is expanded into its input.
   *
   * The launcher follows the macOS toolbar pattern: it rests as a single search button and becomes
   * a search field on activation, so a narrow window spends its width on the navigation instead of
   * on a permanently open input.
   *
   * @public
   * @readonly
   */
  public readonly isSearchExpanded = signal(false);

  /**
   * Enabled workspaces available to the global workspace scope.
   *
   * @public
   * @readonly
   */
  public readonly workspaces = computed(
    () => this._store.settings()?.workspaces.filter((workspace) => workspace.enabled) ?? [],
  );

  /**
   * Feature-owned destinations for the desktop header in their configured order.
   *
   * @public
   * @readonly
   */
  public readonly navigationItems = this._navigation.byRegion('desktop-main');
  /** Feature-owned destinations inside the existing workspace menu. @public @readonly */
  public readonly workspaceMenuItems = this._navigation.byRegion('workspace-menu');

  /** Active workspace represented by the global avatar trigger. */
  public readonly activeWorkspace = this._store.activeWorkspace;

  /**
   * Selects the active workspace.
   *
   * @public
   * @readonly
   */
  public readonly selectWorkspaceCommand: Command<string> = new Command((workspaceId) => {
    void this.selectWorkspace(workspaceId);
  });

  /**
   * Navigates to a primary navigation target.
   *
   * `mosaik-segment` owns the checked state of its items: `SegmentElement.onClick` writes
   * `isChecked` on every item imperatively, and the item's own `Checkable` behaviour toggles on
   * click. Keyboard activation reaches those handlers but not the `routerLink` on the item host, so
   * navigation is driven from the element's own `checked` output instead of from the click.
   *
   * @public
   * @readonly
   */
  public readonly navigateToRouteCommand: Command<string> = new Command((path) => {
    void this._router.navigateByUrl(path);
  });

  /**
   * Stops voice input when the search surface loses focus.
   *
   * @public
   * @readonly
   */
  public readonly stopVoiceInputCommand = new Command(() => this.stopVoiceInput());

  /**
   * The selected rail view.
   *
   * @public
   * @readonly
   */
  public readonly selectedRailView = signal<RailView>(
    this._store.executionAvailable ? 'agent-runs' : 'actions',
  );

  /** Included features determine the existing rail surfaces. @public @readonly */
  public readonly executionAvailable = this._store.executionAvailable;
  /** CI's tab and commands exist only when that feature is included. @public @readonly */
  public readonly ciAvailable = this._store.ciAvailable;
  /** Workspace scope can change only through its included owner. @public @readonly */
  public readonly workspaceScopeAvailable = this._store.workspaceScopeAvailable;

  /**
   * The voice input available.
   *
   * @public
   * @readonly
   */
  public readonly voiceInputAvailable = this._speechRecognition.available;

  /**
   * The rail runs.
   *
   * @public
   * @readonly
   */
  public readonly railRuns = computed(() => {
    const snapshot = this._store.snapshot();
    const settings = this._store.settings();
    const activeLocalRunId = this._store.localCiRunningRunId();
    return buildRailRuns({
      executions: this._store.executionAvailable ? (snapshot?.executions ?? []) : [],
      executionQueue: this._store.executionAvailable ? (snapshot?.executionQueue ?? []) : [],
      events: snapshot?.events ?? [],
      workItems: snapshot?.workItems ?? [],
      ciRuns: this._store.ciAvailable ? (snapshot?.ciRuns ?? []) : [],
      localCiExecutions: this._store.ciAvailable ? (snapshot?.localCiExecutions ?? []) : [],
      repositoryNames: Object.fromEntries(
        settings?.repositoryBindings.map((repository) => [repository.id, repository.displayName]) ??
          [],
      ),
      ...(activeLocalRunId
        ? {
            activeLocalCiRun: {
              runId: activeLocalRunId,
              startedAt: this._store.localCiStartedAt() ?? new Date().toISOString(),
            },
          }
        : {}),
    });
  });

  /**
   * The visible rail runs.
   *
   * @public
   * @readonly
   */
  public readonly visibleRailRuns = computed(() =>
    this.railRuns().filter((run) =>
      this.selectedRailView() === 'agent-runs' ? run.kind === 'agent' : run.kind !== 'agent',
    ),
  );

  /**
   * The actions remote data.
   *
   * @public
   * @readonly
   */
  public readonly actionsRemoteData = computed(() => this._store.snapshot()?.remoteData?.ciRuns);

  /** Whether the compact rail owns a remote-data notice on the active route. */
  public readonly showActionsRemoteDataNotice = computed(() =>
    shouldShowActionsRemoteDataNotice(
      this._routeState(),
      this.actionsRemoteData(),
      this._store.snapshot()?.remoteData?.pullRequests,
    ),
  );
  private readonly _toggleRailCommand: Command<void> = new Command(
    () => void this.onExecuteToggleRailCommand(),
  );
  private readonly _closeRailCommand: Command<void> = new Command(
    () => void this.onExecuteCloseRailCommand(),
  );
  private readonly _handleRailSplitRepositionCommand: Command<unknown> = new Command(
    (event) => void this.onExecuteHandleRailSplitRepositionCommand(event),
  );
  private readonly _openRailRunCommand: Command<IRailRun> = new Command(
    (run) => void this.onExecuteOpenRailRunCommand(run),
  );
  private readonly _removeQueuedRunCommand: Command<readonly [run: IRailRun, event?: Event]> =
    new Command((parameters) => void this.onExecuteRemoveQueuedRunCommand(...parameters));
  private readonly _selectRailViewCommand: Command<RailView> = new Command(
    (view) => void this.onExecuteSelectRailViewCommand(view),
  );
  private readonly _refreshActionsCommand: Command<void> = new Command(
    () => void this.onExecuteRefreshActionsCommand(),
  );
  private readonly _searchCommand: Command<string> = new Command(
    (query) => void this.onExecuteSearchCommand(query),
  );
  private readonly _toggleVoiceInputCommand: Command<void> = new Command(
    () => void this.onExecuteToggleVoiceInputCommand(),
  );
  private readonly _installUpdateCommand: Command<void> = new Command(
    () => void this.updates.install(),
    computed(() => this.updates.state()?.kind === 'ready' && !this.updates.busy()),
  );
  private readonly _downloadUpdateCommand: Command<void> = new Command(
    () => void this.updates.download(),
    computed(() => this.updates.state()?.kind === 'available' && !this.updates.busy()),
  );
  // #endregion

  // #region Ctor

  public constructor() {
    if (this._routeState().split('?')[0] === '/main/orbit') this.isRailOpen.set(false);
    effect(() => {
      const url = this._routeState();
      const runId = new URLSearchParams(url.split('?')[1] ?? '').get('run');
      if (!runId || !url.startsWith('/main/actions')) {
        this._openedRunLink = '';
        return;
      }
      if (runId === this._openedRunLink) return;
      const run = this.railRuns().find((entry) => entry.ciRunId === runId);
      if (run) {
        this._openedRunLink = runId;
        this.openAction(run);
      }
    });
    this.syncSearchQueryFromRoute();
    this._router.events
      .pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        takeUntilDestroyed(this._destroyRef),
      )
      .subscribe((event) => {
        if (
          event.urlAfterRedirects.split('?')[0] === '/main/orbit' &&
          this._routeState().split('?')[0] !== '/main/orbit'
        ) {
          this.isRailOpen.set(false);
        }
        this._routeState.set(event.urlAfterRedirects);
        this.syncSearchQueryFromRoute();
      });
    this._destroyRef.onDestroy(() => void this._speechRecognition.cancel());
  }

  // #endregion

  // #region Properties

  /**
   * The toggleRail command.
   *
   * @public
   * @readonly
   */
  public get toggleRailCommand(): Command<void> {
    return this._toggleRailCommand;
  }
  /**
   * The closeRail command.
   *
   * @public
   * @readonly
   */
  public get closeRailCommand(): Command<void> {
    return this._closeRailCommand;
  }
  /**
   * The handleRailSplitReposition command.
   *
   * @public
   * @readonly
   */
  public get handleRailSplitRepositionCommand(): Command<unknown> {
    return this._handleRailSplitRepositionCommand;
  }
  /**
   * The openRailRun command.
   *
   * @public
   * @readonly
   */
  public get openRailRunCommand(): Command<IRailRun> {
    return this._openRailRunCommand;
  }
  /**
   * The removeQueuedRun command.
   *
   * @public
   * @readonly
   */
  public get removeQueuedRunCommand(): Command<readonly [run: IRailRun, event?: Event]> {
    return this._removeQueuedRunCommand;
  }
  /**
   * The selectRailView command.
   *
   * @public
   * @readonly
   */
  public get selectRailViewCommand(): Command<RailView> {
    return this._selectRailViewCommand;
  }
  /**
   * The refreshActions command.
   *
   * @public
   * @readonly
   */
  public get refreshActionsCommand(): Command<void> {
    return this._refreshActionsCommand;
  }
  /**
   * The search command.
   *
   * @public
   * @readonly
   */
  public get searchCommand(): Command<string> {
    return this._searchCommand;
  }
  /**
   * The toggleVoiceInput command.
   *
   * @public
   * @readonly
   */
  public get toggleVoiceInputCommand(): Command<void> {
    return this._toggleVoiceInputCommand;
  }

  /**
   * Installs the update that has already downloaded and is ready to apply.
   *
   * @public
   * @readonly
   */
  public get installUpdateCommand(): Command<void> {
    return this._installUpdateCommand;
  }

  /**
   * Opens the installer download for an available update.
   *
   * @public
   * @readonly
   */
  public get downloadUpdateCommand(): Command<void> {
    return this._downloadUpdateCommand;
  }
  // #endregion

  // #region Methods

  /**
   * Toggles the rail.
   *
   * @private
   */
  private onExecuteToggleRailCommand(): void {
    this.setRailOpen(!this.isRailOpen());
  }

  /**
   * Closes the rail.
   *
   * @private
   */
  private onExecuteCloseRailCommand(): void {
    this.setRailOpen(false);
  }

  /**
   * Handles the rail split reposition.
   *
   * @param event - Event.
   * @private
   */
  private onExecuteHandleRailSplitRepositionCommand(event: unknown): void {
    const payload = eventRecord(event);
    const position = payload['position'];
    if (typeof position !== 'number' || !Number.isFinite(position)) return;
    this.setRailOpen(position < 100);
  }

  /**
   * Opens the execution.
   *
   * @param executionId - Execution id.
   * @private
   */
  private openExecution(executionId: string): void {
    if (!this.executionAvailable) return;
    if (this._activeExecutionDrawer && this._drawerService.isShown(this._activeExecutionDrawer)) {
      this._activeExecutionDrawer.requestAttention();
      return;
    }

    const drawer = this._drawerService.show<IExecutionDrawerData>(ExecutionDrawerView, {
      data: { executionId },
    });
    this._activeExecutionDrawer = drawer;
    drawer.closed.subscribe(() => {
      if (this._activeExecutionDrawer === drawer) this._activeExecutionDrawer = undefined;
    });
  }

  /**
   * Opens the rail run.
   *
   * @param run - Run.
   * @private
   */
  private onExecuteOpenRailRunCommand(run: IRailRun): void {
    // A waiting step has no run to open yet; withdrawing it is the only thing it offers.
    if (run.queueEntryId) return;
    if (run.executionId) {
      this.openExecution(run.executionId);
      return;
    }
    this.openAction(run);
  }

  /**
   * Removes the queued run.
   *
   * @param run - Run.
   * @param event - Event.
   * @private
   */
  private async onExecuteRemoveQueuedRunCommand(run: IRailRun, event?: Event): Promise<void> {
    event?.stopPropagation();
    if (!run.queueEntryId) return;
    await this._store.removeQueueEntry(run.queueEntryId);
  }

  /**
   * Selects the rail view.
   *
   * @param view - View.
   * @private
   */
  private onExecuteSelectRailViewCommand(view: RailView): void {
    this.selectedRailView.set(view);
  }

  /**
   * Refreshes the actions.
   *
   * @private
   */
  private async onExecuteRefreshActionsCommand(): Promise<void> {
    await this._store.refreshContinuousIntegrationRuns();
  }

  private async selectWorkspace(workspaceId: string): Promise<void> {
    await this._store.selectWorkspaceScope(workspaceId);
  }

  /**
   * Whether it is execution active.
   *
   * @param execution - Execution.
   * @private
   */
  private isExecutionActive(execution: IExecutionRecord): boolean {
    return (
      execution.state === 'queued' || execution.state === 'running' || execution.state === 'waiting'
    );
  }

  /**
   * Returns the search.
   *
   * @param query - Query.
   * @private
   */
  private async onExecuteSearchCommand(query: string): Promise<void> {
    await this._search.search(query);
  }

  /**
   * Toggles the voice input.
   *
   * @private
   */
  private onExecuteToggleVoiceInputCommand(): void {
    if (this.isVoiceInputActive()) {
      void this._speechRecognition.stop();
      return;
    }
    this.isVoiceInputActive.set(true);
    void this._speechRecognition.start(
      (transcript) => {
        this.searchQuery.set(transcript);
        void this.onExecuteSearchCommand(transcript);
      },
      () => this.finishVoiceInput(),
    );
  }

  private openAction(run: IRailRun): void {
    if (!this.ciAvailable) return;
    if (this._activeActionDrawer && this._drawerService.isShown(this._activeActionDrawer)) {
      this._activeActionDrawer.requestAttention();
      return;
    }
    const drawer = this._drawerService.show<IActionDrawerData>(ActionDrawerView, {
      data: { run },
    });
    this._activeActionDrawer = drawer;
    drawer.closed.subscribe(() => {
      if (this._activeActionDrawer === drawer) this._activeActionDrawer = undefined;
    });
  }

  private finishVoiceInput(): void {
    this.isVoiceInputActive.set(false);
  }

  private stopVoiceInput(): void {
    if (!this.isVoiceInputActive()) return;
    void this._speechRecognition.stop();
  }

  private syncSearchQueryFromRoute(): void {
    const queryIndex = this._router.url.indexOf('?');
    if (queryIndex < 0) {
      this.searchQuery.set('');
      return;
    }
    const query = new URLSearchParams(this._router.url.slice(queryIndex + 1)).get('q') ?? '';
    this.searchQuery.set(query);
  }

  private setRailOpen(value: boolean): void {
    this.isRailOpen.set(value);
    writeStoredBoolean(RAIL_OPEN_STORAGE_KEY, value);
  }

  // #endregion
}

function eventRecord(event: unknown): Record<string, unknown> {
  if (typeof event !== 'object' || event === null) return {};
  const record = event as Record<string, unknown>;
  return typeof record['detail'] === 'object' && record['detail'] !== null
    ? (record['detail'] as Record<string, unknown>)
    : record;
}

function readStoredBoolean(key: string): boolean | undefined {
  const value = browserStorage()?.getItem(key);
  return value === 'true' ? true : value === 'false' ? false : undefined;
}

function writeStoredBoolean(key: string, value: boolean): void {
  browserStorage()?.setItem(key, String(value));
}
