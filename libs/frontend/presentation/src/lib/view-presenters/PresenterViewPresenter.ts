// #region Imports

import { Location } from '@angular/common';
import { computed, DestroyRef, effect, inject, Injectable, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, NavigationStart, Router } from '@angular/router';
import { DrawerService, THEME, type IDrawerRef } from '@pixel-brewery/mosaik-elements-angular';
import { projectAgentActivity } from '@symphony/domain-execution';
import {
  browserStorage,
  Clock,
  Command,
  NavigationRegistry,
  type INavigationItem,
} from '@symphony/frontend-core';
import { DESKTOP_CLIENT } from '@symphony/frontend-core/desktop';
import type { ApplicationSettingsDto } from '@symphony/ipc-contracts-composition';
import { filter } from 'rxjs';
import {
  ActionDrawerView,
  type IActionDrawerData,
} from '@symphony/frontend-feature-ci/presentation';
import { ExecutionDrawerView } from '@symphony/frontend-feature-execution';
import { type IExecutionDrawerData } from '@symphony/frontend-feature-execution';
import { buildRailRuns, type IRailRun } from '@symphony/frontend-feature-execution/projections';
import { CommandPalette } from '@symphony/frontend-search';
import { DesktopUpdateStore } from '@symphony/frontend-update';
import { PRESENTATION_CONTEXT } from '../ports/PresentationContextToken';

// #endregion

const SIDEBAR_COLLAPSED_STORAGE_KEY = 'presentation.isSidebarCollapsed';
const RUN_VIEW_STORAGE_KEY = 'presentation.runView';
type RunView = 'agents' | 'actions';

interface INavigationGroup {
  readonly key: string;
  readonly label: string;
  readonly items: readonly INavigationItem[];
}

type AgentProfile = ApplicationSettingsDto['agentProfiles'][number];
type ExecutionReference = { readonly id: string; readonly startedAt: string };
type AgentActivityState = ReturnType<typeof projectAgentActivity>[number]['state'];

interface IAgentRow {
  readonly id: string;
  readonly name: string;
  readonly profile: AgentProfile;
  readonly state: AgentActivityState;
  readonly role?: string;
  readonly workItemKey?: string;
  readonly executionId?: string;
  readonly runsToday: number;
}

/**
 * Owns the main window's chrome: the source-list sidebar with its run panel, the unified toolbar
 * and the status bar along the bottom edge.
 *
 * @public
 */
@Injectable()
export class PresenterViewPresenter {
  // #region Fields

  private readonly _router = inject(Router);
  private readonly _location = inject(Location);
  private readonly _destroyRef = inject(DestroyRef);
  private readonly _store = inject(PRESENTATION_CONTEXT);
  private readonly _navigation = inject(NavigationRegistry);
  private readonly _drawerService = inject(DrawerService);
  private readonly _desktop = inject(DESKTOP_CLIENT);
  private readonly _palette = inject(CommandPalette);
  private readonly _clock = inject(Clock);
  private readonly _routeState = signal(this._router.url);
  private readonly _history = signal<{ readonly ids: readonly number[]; readonly index: number }>({
    ids: [],
    index: -1,
  });
  private _pendingTrigger: NavigationStart['navigationTrigger'];
  private _pendingRestoredId: number | undefined;
  private _pendingReplacesUrl = false;
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
   * Current time for relative labels in the chrome.
   *
   * @public
   * @readonly
   */
  public readonly now = this._clock.now;

  /**
   * Whether the source-list sidebar is hidden. The choice survives a restart.
   *
   * @public
   * @readonly
   */
  public readonly isSidebarCollapsed = signal(
    readStoredBoolean(SIDEBAR_COLLAPSED_STORAGE_KEY) ?? false,
  );

  /**
   * Enabled workspaces available to the workspace switcher.
   *
   * @public
   * @readonly
   */
  public readonly workspaces = computed(
    () => this._store.settings()?.workspaces.filter((workspace) => workspace.enabled) ?? [],
  );

  /** Active workspace shown in the switcher card. @public @readonly */
  public readonly activeWorkspace = this._store.activeWorkspace;

  /**
   * Repository slug shown under the workspace name: the first enabled repository of the active
   * workspace, or empty while it has none.
   *
   * @public
   * @readonly
   */
  public readonly activeRepositorySlug = computed(() => {
    const workspaceId = this.activeWorkspace()?.id;
    const repository = this._store
      .settings()
      ?.repositoryBindings.find(
        (binding) => binding.workspaceId === workspaceId && binding.enabled,
      );
    return repository ? `${repository.owner}/${repository.name}` : '';
  });

  /**
   * Feature-owned destinations grouped for the sidebar: ungrouped destinations first, then each
   * group in the order of its first destination.
   *
   * @public
   * @readonly
   */
  public readonly navigationGroups = computed<readonly INavigationGroup[]>(() => {
    const groups: { key: string; label: string; items: INavigationItem[] }[] = [];
    for (const item of this._navigationItems()) {
      const label = item.group ?? '';
      let group = groups.find((entry) => entry.label === label);
      if (!group) {
        group = { key: label ? label.toLowerCase() : 'primary', label, items: [] };
        if (label) groups.push(group);
        else groups.unshift(group);
      }
      group.items.push(item);
    }
    return groups;
  });

  /**
   * Label of the sidebar destination that contains the current route, the toolbar title for a
   * screen that registered none of its own.
   *
   * @public
   * @readonly
   */
  public readonly activeNavigationLabel = computed(() => {
    const path = this._routeState().split('?')[0] ?? '';
    return (
      this._navigationItems().find(
        (item) => path === item.route || path.startsWith(`${item.route}/`),
      )?.label ?? ''
    );
  });

  /** Whether toolbar back navigation is available. @public @readonly */
  public readonly canGoBack = computed(() => this._history().index > 0);

  /** Whether toolbar forward navigation is available. @public @readonly */
  public readonly canGoForward = computed(() => {
    const history = this._history();
    return history.index >= 0 && history.index < history.ids.length - 1;
  });

  /**
   * The selected run panel segment.
   *
   * @public
   * @readonly
   */
  public readonly selectedRunView = signal<RunView>(
    readStoredRunView() ?? (this._store.executionAvailable ? 'agents' : 'actions'),
  );

  /** Included features determine the existing run surfaces. @public @readonly */
  public readonly executionAvailable = this._store.executionAvailable;
  /** CI's segment and commands exist only when that feature is included. @public @readonly */
  public readonly ciAvailable = this._store.ciAvailable;
  /** Workspace scope can change only through its included owner. @public @readonly */
  public readonly workspaceScopeAvailable = this._store.workspaceScopeAvailable;

  /**
   * Runs of every source, newest first, as the rail projected them.
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
   * Current action runs for the run panel: every running and queued run, then the latest failure.
   *
   * @public
   * @readonly
   */
  public readonly currentActionRuns = computed(() => {
    const actions = this.railRuns().filter((run) => run.kind !== 'agent');
    const current = actions.filter(
      (run) => run.active || run.queueEntryId || run.state === 'queued',
    );
    const latestFailure = actions.find((run) => !run.active && run.state === 'failed');
    return latestFailure ? [...current, latestFailure] : current;
  });

  /**
   * Agent steps waiting for a free execution slot, listed under the agents so they can be withdrawn.
   *
   * @public
   * @readonly
   */
  public readonly waitingAgentSteps = computed(() =>
    this.railRuns().filter((run) => run.kind === 'agent' && run.queueEntryId),
  );

  /**
   * Number of running and queued action runs, shown on the `Actions` segment.
   *
   * @public
   * @readonly
   */
  public readonly activeActionRunCount = computed(
    () =>
      this.currentActionRuns().filter(
        (run) => run.active || run.queueEntryId || run.state === 'queued',
      ).length,
  );

  /**
   * Agents of the active workspace with what each one is doing right now.
   *
   * @public
   * @readonly
   */
  public readonly agentRows = computed<readonly IAgentRow[]>(() => {
    const settings = this._store.settings();
    const workspaceId = this.activeWorkspace()?.id;
    if (!settings || !workspaceId) return [];
    const snapshot = this._store.snapshot();
    const profiles = settings.agentProfiles.filter(
      (profile) => profile.workspaceId === workspaceId && profile.enabled,
    );
    const activities = projectAgentActivity(profiles, snapshot, true);
    const workItems = new Map(snapshot?.workItems.map((item) => [item.id, item]) ?? []);
    const startOfDay = new Date(this.now());
    startOfDay.setHours(0, 0, 0, 0);
    const today = startOfDay.toISOString();
    return profiles.map((profile) => {
      const activity = activities.find((entry) => entry.agentId === profile.id);
      // Finished work no longer occupies the agent: it reads as idle with today's run count.
      const state = !activity || activity.state === 'completed' ? 'idle' : activity.state;
      const work = state === 'idle' ? undefined : activity?.work[0];
      const runsToday =
        snapshot?.executions.filter(
          (execution) =>
            execution.bindingSnapshot?.agentProfileId === profile.id &&
            execution.startedAt >= today,
        ).length ?? 0;
      const workItemKey = work ? workItems.get(work.workItemId)?.externalId : undefined;
      // A blocked goal carries no execution of its own; the row then opens the agent's latest run
      // on that work item, so the failure that blocked it stays one click away.
      const executionId =
        work?.executionId ??
        (work
          ? snapshot?.executions
              .filter(
                (execution) =>
                  execution.workItemId === work.workItemId &&
                  execution.bindingSnapshot?.agentProfileId === profile.id,
              )
              .reduce<ExecutionReference | undefined>(
                (latest, execution) =>
                  !latest || execution.startedAt > latest.startedAt ? execution : latest,
                undefined,
              )?.id
          : undefined);
      return {
        id: profile.id,
        name: profile.displayName,
        profile,
        state,
        runsToday,
        ...(work?.role ? { role: work.role } : {}),
        ...(workItemKey ? { workItemKey } : {}),
        ...(executionId ? { executionId } : {}),
      };
    });
  });

  /**
   * GitHub synchronisation state shown at the leading end of the status bar: the oldest of the
   * pull-request and Actions refreshes, because the sync is only as current as its slowest part.
   *
   * @public
   * @readonly
   */
  public readonly syncState = computed(() => {
    const remoteData = this._store.snapshot()?.remoteData;
    const sources = [remoteData?.pullRequests, remoteData?.ciRuns].filter(
      (source) => source !== undefined,
    );
    if (sources.length === 0) return undefined;
    const state = sources.some((source) => source.state === 'unavailable')
      ? 'unavailable'
      : sources.some((source) => source.state === 'stale')
        ? 'stale'
        : 'current';
    const refreshTimes = sources
      .map((source) => source.lastSuccessfulRefreshAt)
      .filter((time): time is string => Boolean(time))
      .sort();
    const rateLimited = sources.find((source) => source.reason === 'rate-limited');
    return {
      state,
      ...(refreshTimes[0] ? { lastSuccessfulRefreshAt: refreshTimes[0] } : {}),
      ...(rateLimited?.retryAt ? { retryAt: rateLimited.retryAt } : {}),
      rateLimited: Boolean(rateLimited),
    } as const;
  });

  /** Whether a GitHub refresh is in flight. @public @readonly */
  public readonly syncBusy = computed(
    () => this._syncBusy() || this._store.continuousIntegrationRunsBusy(),
  );

  private readonly _navigationItems = this._navigation.byRegion('desktop-main');

  private readonly _toggleSidebarCommand: Command<void> = new Command(() =>
    this.setSidebarCollapsed(!this.isSidebarCollapsed()),
  );
  private readonly _goBackCommand: Command<void> = new Command(
    () => this._location.back(),
    this.canGoBack,
  );
  private readonly _goForwardCommand: Command<void> = new Command(
    () => this._location.forward(),
    this.canGoForward,
  );
  private readonly _navigateToRouteCommand: Command<string> = new Command((path) => {
    void this._router.navigateByUrl(path);
  });
  private readonly _selectWorkspaceCommand: Command<string> = new Command((workspaceId) => {
    void this._store.selectWorkspaceScope(workspaceId);
  });
  private readonly _openSettingsCommand: Command<void> = new Command(
    () => void this._desktop.request('settings.open', {}),
  );
  private readonly _openPaletteCommand: Command<void> = new Command(() => this._palette.open());
  private readonly _openRailRunCommand: Command<IRailRun> = new Command(
    (run) => void this.onExecuteOpenRailRunCommand(run),
  );
  private readonly _openAgentCommand: Command<string | undefined> = new Command((executionId) => {
    if (executionId) this.openExecution(executionId);
  });
  private readonly _removeQueuedRunCommand: Command<readonly [run: IRailRun, event?: Event]> =
    new Command((parameters) => void this.onExecuteRemoveQueuedRunCommand(...parameters));
  private readonly _selectRunViewCommand: Command<RunView> = new Command((view) => {
    this.selectedRunView.set(view);
    browserStorage()?.setItem(RUN_VIEW_STORAGE_KEY, view);
  });
  private readonly _syncBusy = signal(false);
  private readonly _synchronizeCommand: Command<void> = new Command(
    () => void this.synchronize(),
    computed(() => !this._syncBusy()),
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
    // The start navigation completes while the shell still hydrates, before this window chrome
    // exists, so the history starts at the entry that is already shown.
    const shown = this._router.navigated ? this._router.lastSuccessfulNavigation()?.id : undefined;
    if (shown !== undefined) this._history.set({ ids: [shown], index: 0 });
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
    this._router.events
      .pipe(
        filter((event): event is NavigationStart => event instanceof NavigationStart),
        takeUntilDestroyed(this._destroyRef),
      )
      .subscribe((event) => {
        this._pendingTrigger = event.navigationTrigger;
        this._pendingRestoredId = event.restoredState?.navigationId;
        this._pendingReplacesUrl = this._router.currentNavigation()?.extras.replaceUrl === true;
      });
    this._router.events
      .pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        takeUntilDestroyed(this._destroyRef),
      )
      .subscribe((event) => {
        this._routeState.set(event.urlAfterRedirects);
        this.recordHistory(event.id);
      });
  }

  // #endregion

  // #region Properties

  /** Collapses or restores the sidebar. @public @readonly */
  public get toggleSidebarCommand(): Command<void> {
    return this._toggleSidebarCommand;
  }

  /** Goes back in the navigation history. @public @readonly */
  public get goBackCommand(): Command<void> {
    return this._goBackCommand;
  }

  /** Goes forward in the navigation history. @public @readonly */
  public get goForwardCommand(): Command<void> {
    return this._goForwardCommand;
  }

  /** Opens a sidebar destination. @public @readonly */
  public get navigateToRouteCommand(): Command<string> {
    return this._navigateToRouteCommand;
  }

  /** Switches the active workspace. @public @readonly */
  public get selectWorkspaceCommand(): Command<string> {
    return this._selectWorkspaceCommand;
  }

  /** Opens the Settings window. @public @readonly */
  public get openSettingsCommand(): Command<void> {
    return this._openSettingsCommand;
  }

  /** Opens the command palette. @public @readonly */
  public get openPaletteCommand(): Command<void> {
    return this._openPaletteCommand;
  }

  /** Opens a run from the run panel. @public @readonly */
  public get openRailRunCommand(): Command<IRailRun> {
    return this._openRailRunCommand;
  }

  /** Opens the execution an agent is working on. @public @readonly */
  public get openAgentCommand(): Command<string | undefined> {
    return this._openAgentCommand;
  }

  /** Withdraws a queued step from the run panel. @public @readonly */
  public get removeQueuedRunCommand(): Command<readonly [run: IRailRun, event?: Event]> {
    return this._removeQueuedRunCommand;
  }

  /** Switches the run panel between `Agents` and `Actions`. @public @readonly */
  public get selectRunViewCommand(): Command<RunView> {
    return this._selectRunViewCommand;
  }

  /**
   * Synchronises with GitHub again: the snapshot and the Actions runs, as `Sync now` does. The
   * status bar offers it while the sync is stale or unavailable.
   *
   * @public
   * @readonly
   */
  public get synchronizeCommand(): Command<void> {
    return this._synchronizeCommand;
  }

  /** Installs the downloaded update and restarts Symphony. @public @readonly */
  public get installUpdateCommand(): Command<void> {
    return this._installUpdateCommand;
  }

  /** Starts downloading the available update. @public @readonly */
  public get downloadUpdateCommand(): Command<void> {
    return this._downloadUpdateCommand;
  }

  // #endregion

  // #region Methods

  private async synchronize(): Promise<void> {
    this._syncBusy.set(true);
    try {
      await this._store.synchronize();
    } finally {
      this._syncBusy.set(false);
    }
  }

  private recordHistory(navigationId: number): void {
    const trigger = this._pendingTrigger;
    const restoredId = this._pendingRestoredId;
    const replaces = this._pendingReplacesUrl;
    this._history.update((history) => {
      if (trigger === 'popstate' && restoredId !== undefined) {
        const index = history.ids.indexOf(restoredId);
        if (index >= 0) {
          // Angular reuses the restored id for the state it navigates back to.
          return { ids: history.ids, index };
        }
      }
      if (replaces && history.index >= 0) {
        const ids = history.ids.map((id, position) =>
          position === history.index ? navigationId : id,
        );
        return { ids, index: history.index };
      }
      const ids = [...history.ids.slice(0, history.index + 1), navigationId];
      return { ids, index: ids.length - 1 };
    });
  }

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

  private onExecuteOpenRailRunCommand(run: IRailRun): void {
    // A waiting step has no run to open yet; withdrawing it is the only thing it offers.
    if (run.queueEntryId) return;
    if (run.executionId) {
      this.openExecution(run.executionId);
      return;
    }
    this.openAction(run);
  }

  private async onExecuteRemoveQueuedRunCommand(run: IRailRun, event?: Event): Promise<void> {
    event?.stopPropagation();
    if (!run.queueEntryId) return;
    await this._store.removeQueueEntry(run.queueEntryId);
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

  private setSidebarCollapsed(value: boolean): void {
    this.isSidebarCollapsed.set(value);
    browserStorage()?.setItem(SIDEBAR_COLLAPSED_STORAGE_KEY, String(value));
  }

  // #endregion
}

function readStoredBoolean(key: string): boolean | undefined {
  const value = browserStorage()?.getItem(key);
  return value === 'true' ? true : value === 'false' ? false : undefined;
}

function readStoredRunView(): RunView | undefined {
  const value = browserStorage()?.getItem(RUN_VIEW_STORAGE_KEY);
  return value === 'agents' || value === 'actions' ? value : undefined;
}
