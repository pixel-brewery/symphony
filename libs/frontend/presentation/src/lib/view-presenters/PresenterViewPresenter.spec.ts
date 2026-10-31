// @vitest-environment jsdom

// #region Imports

import { Location } from '@angular/common';
import { signal, type Signal, type WritableSignal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { NavigationEnd, NavigationStart, Router } from '@angular/router';
import { DrawerService, THEME } from '@pixel-brewery/mosaik-elements-angular';
import { Clock, type INavigationItem } from '@symphony/frontend-core';
import { provideNavigation, withNavigationItems } from '@symphony/frontend-core/navigation';
import { DESKTOP_CLIENT } from '@symphony/frontend-core/desktop';
import type {
  ApplicationSettingsDto,
  IOrchestrationSnapshot,
} from '@symphony/ipc-contracts-composition';
import { CommandPalette } from '@symphony/frontend-search';
import { DesktopUpdateStore } from '@symphony/frontend-update';
import { Subject } from 'rxjs';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { PRESENTATION_CONTEXT } from '../ports/PresentationContextToken';
import { PresenterViewPresenter } from './PresenterViewPresenter';

vi.mock('@pixel-brewery/mosaik-elements-angular', async () => {
  const { InjectionToken } = await import('@angular/core');
  return {
    DrawerService: class DrawerService {},
    THEME: new InjectionToken('THEME'),
  };
});

vi.mock('@symphony/frontend-core', async () => {
  const { NavigationRegistry } = await vi.importActual<
    typeof import('@symphony/frontend-core/navigation')
  >('@symphony/frontend-core/navigation');
  const { signal: createSignal } = await import('@angular/core');
  return {
    NavigationRegistry,
    browserStorage: () => window.localStorage,
    Clock: class Clock {},
    Command: class Command<TParameter> {
      // #region Fields

      private readonly _executeHandler: (parameter: TParameter) => void;
      private readonly _canExecute: Signal<boolean>;

      // #endregion

      // #region Ctor

      public constructor(
        executeHandler: (parameter: TParameter) => void,
        canExecute: Signal<boolean> = createSignal(true),
      ) {
        this._executeHandler = executeHandler;
        this._canExecute = canExecute;
      }

      // #endregion

      // #region Properties

      public readonly canExecute = (): boolean => this._canExecute();

      // #endregion

      // #region Methods

      public execute(parameter: TParameter): void {
        if (this._canExecute()) this._executeHandler(parameter);
      }

      // #endregion
    },
  };
});

vi.mock('@symphony/frontend-update', () => ({
  DesktopUpdateStore: class DesktopUpdateStore {},
}));

vi.mock('@symphony/frontend-search', () => ({
  CommandPalette: class CommandPalette {},
}));

vi.mock('@symphony/frontend-feature-ci/presentation', () => ({
  ActionDrawerView: class ActionDrawerView {},
}));

vi.mock('@symphony/frontend-feature-execution', () => ({
  ExecutionDrawerView: class ExecutionDrawerView {},
}));

// #endregion

interface IFixture {
  readonly presenter: PresenterViewPresenter;
  readonly events: Subject<NavigationStart | NavigationEnd>;
  readonly location: { back: ReturnType<typeof vi.fn>; forward: ReturnType<typeof vi.fn> };
  readonly desktop: { request: ReturnType<typeof vi.fn> };
  readonly show: ReturnType<typeof vi.fn>;
  readonly install: ReturnType<typeof vi.fn>;
}

function configure(options: {
  readonly url?: string;
  readonly snapshot?: WritableSignal<IOrchestrationSnapshot | undefined>;
  readonly settings?: Partial<ApplicationSettingsDto>;
  readonly navigation?: readonly INavigationItem[];
  readonly updateState?: unknown;
  readonly updateBusy?: boolean;
  readonly startNavigationId?: number;
}): IFixture {
  const events = new Subject<NavigationStart | NavigationEnd>();
  const location = { back: vi.fn(), forward: vi.fn() };
  const desktop = { request: vi.fn(async () => ({ completed: true })) };
  const show = vi.fn(() => ({ closed: new Subject<void>(), requestAttention: vi.fn() }));
  const install = vi.fn();
  const router = {
    url: options.url ?? '/main/home',
    events,
    navigateByUrl: vi.fn(),
    currentNavigation: () => null,
    navigated: options.startNavigationId !== undefined,
    lastSuccessfulNavigation: () =>
      options.startNavigationId === undefined ? null : { id: options.startNavigationId },
  };
  TestBed.configureTestingModule({
    providers: [
      provideNavigation(
        ...(options.navigation?.length
          ? [withNavigationItems({ id: 'test-navigation', items: options.navigation })]
          : []),
      ),
      PresenterViewPresenter,
      { provide: Router, useValue: router },
      { provide: Location, useValue: location },
      { provide: DrawerService, useValue: { show, isShown: vi.fn(() => false) } },
      { provide: THEME, useValue: signal(undefined) },
      { provide: Clock, useValue: { now: signal(Date.parse('2026-10-30T12:00:00Z')) } },
      { provide: DESKTOP_CLIENT, useValue: desktop },
      { provide: CommandPalette, useValue: { open: vi.fn() } },
      {
        provide: DesktopUpdateStore,
        useValue: {
          state: signal(options.updateState),
          busy: signal(options.updateBusy ?? false),
          install,
          download: vi.fn(),
        },
      },
      {
        provide: PRESENTATION_CONTEXT,
        useValue: {
          executionAvailable: true,
          ciAvailable: true,
          workspaceScopeAvailable: true,
          loading: signal(false),
          snapshot: options.snapshot ?? signal(undefined),
          settings: signal(options.settings),
          activeWorkspace: signal(options.settings?.workspaces?.[0]),
          localCiRunningRunId: signal(undefined),
          localCiStartedAt: signal(undefined),
          continuousIntegrationRunsBusy: signal(false),
          refreshContinuousIntegrationRuns: vi.fn(),
          synchronize: vi.fn(async () => undefined),
          removeQueueEntry: vi.fn(),
          selectWorkspaceScope: vi.fn(),
        },
      },
    ],
  });
  return {
    presenter: TestBed.inject(PresenterViewPresenter),
    events,
    location,
    desktop,
    show,
    install,
  };
}

function navigationItem(overrides: Partial<INavigationItem> & { key: string }): INavigationItem {
  return {
    label: overrides.key,
    icon: 'board',
    route: `/main/${overrides.key}`,
    order: 10,
    region: 'desktop-main',
    ...overrides,
  };
}

describe('PresenterViewPresenter', () => {
  beforeAll(() => TestBed.initTestEnvironment(BrowserTestingModule, platformBrowserTesting()));

  afterAll(() => TestBed.resetTestEnvironment());

  beforeEach(() => {
    const store = new Map<string, string>();
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      value: {
        setItem: vi.fn((key: string, value: string) => store.set(key, value)),
        getItem: vi.fn((key: string) => store.get(key) ?? null),
        removeItem: vi.fn((key: string) => store.delete(key)),
        clear: vi.fn(() => store.clear()),
        key: vi.fn(() => null),
        length: 0,
      },
    });
    TestBed.resetTestingModule();
  });

  it('leads the sidebar with ungrouped destinations and keeps groups in order', () => {
    // arrange
    const { presenter } = configure({
      navigation: [
        navigationItem({ key: 'arcade', order: 60, group: 'More' }),
        navigationItem({ key: 'board', order: 30, group: 'Delivery' }),
        navigationItem({ key: 'home', order: 10 }),
        navigationItem({ key: 'inbox', order: 20, group: 'Delivery' }),
      ],
    });

    // act
    const groups = presenter.navigationGroups();

    // assert
    expect(groups.map((group) => group.label)).toEqual(['', 'Delivery', 'More']);
    expect(groups.map((group) => group.items.map((item) => item.key))).toEqual([
      ['home'],
      ['inbox', 'board'],
      ['arcade'],
    ]);
  });

  it('names the screen after the sidebar destination that contains the route', () => {
    // arrange
    const { presenter, events } = configure({
      navigation: [navigationItem({ key: 'board', label: 'Board' })],
    });

    // act
    events.next(new NavigationEnd(1, '/main/board?column=todo', '/main/board?column=todo'));

    // assert
    expect(presenter.activeNavigationLabel()).toBe('Board');
  });

  it('follows the navigation history for back and forward', () => {
    // arrange
    const { presenter, events, location } = configure({});

    // act
    events.next(new NavigationStart(1, '/main/home', 'imperative'));
    events.next(new NavigationEnd(1, '/main/home', '/main/home'));
    const initialBack = presenter.canGoBack();
    events.next(new NavigationStart(2, '/main/board', 'imperative'));
    events.next(new NavigationEnd(2, '/main/board', '/main/board'));
    const afterSecond = [presenter.canGoBack(), presenter.canGoForward()];
    presenter.goBackCommand.execute();
    events.next(new NavigationStart(3, '/main/home', 'popstate', { navigationId: 1 }));
    events.next(new NavigationEnd(3, '/main/home', '/main/home'));

    // assert
    expect(initialBack).toBe(false);
    expect(afterSecond).toEqual([true, false]);
    expect(location.back).toHaveBeenCalledOnce();
    expect(presenter.canGoBack()).toBe(false);
    expect(presenter.canGoForward()).toBe(true);
  });

  it('starts the history at the screen shown before the chrome existed', () => {
    // arrange
    const { presenter, events } = configure({ startNavigationId: 1 });

    // act
    events.next(new NavigationStart(2, '/main/board', 'imperative'));
    events.next(new NavigationEnd(2, '/main/board', '/main/board'));

    // assert
    expect(presenter.canGoBack()).toBe(true);
    expect(presenter.canGoForward()).toBe(false);
  });

  it('persists the collapsed sidebar', () => {
    // arrange
    const { presenter } = configure({});

    // act
    presenter.toggleSidebarCommand.execute();

    // assert
    expect(presenter.isSidebarCollapsed()).toBe(true);
    expect(window.localStorage.setItem).toHaveBeenCalledWith(
      'presentation.isSidebarCollapsed',
      'true',
    );
  });

  it('lists the running action runs with the latest failure and counts the running ones', () => {
    // arrange
    const snapshot = signal({
      executions: [],
      events: [],
      workItems: [],
      ciRuns: [
        {
          id: 'ci:running',
          workspaceId: 'workspace',
          ciBindingId: 'ci',
          repositoryBindingId: 'repository',
          name: 'Deploy Dev',
          status: 'in-progress',
          startedAt: '2026-10-30T11:58:00Z',
        },
        {
          id: 'ci:failed',
          workspaceId: 'workspace',
          ciBindingId: 'ci',
          repositoryBindingId: 'repository',
          name: 'CI',
          status: 'failed',
          startedAt: '2026-10-30T10:00:00Z',
          finishedAt: '2026-10-30T10:05:00Z',
        },
        {
          id: 'ci:older-failure',
          workspaceId: 'workspace',
          ciBindingId: 'ci',
          repositoryBindingId: 'repository',
          name: 'Lint',
          status: 'failed',
          startedAt: '2026-10-29T10:00:00Z',
          finishedAt: '2026-10-29T10:05:00Z',
        },
      ],
    } as unknown as IOrchestrationSnapshot);
    const { presenter } = configure({ snapshot });

    // act
    const runs = presenter.currentActionRuns();

    // assert
    expect(runs.map((run) => run.title)).toEqual(['Deploy Dev', 'CI']);
    expect(presenter.activeActionRunCount()).toBe(1);
  });

  it('shows each agent of the active workspace with the work item it is on', () => {
    // arrange
    const snapshot = signal({
      events: [],
      workItems: [{ id: 'item-1', externalId: 'CR-0602' }],
      executions: [
        {
          id: 'execution-1',
          workItemId: 'item-1',
          workflowId: 'workflow',
          state: 'running',
          kind: 'solution',
          skillFlowRole: 'solution',
          startedAt: '2026-10-30T11:00:00Z',
          bindingSnapshot: { agentProfileId: 'agent-claude' },
        },
      ],
    } as unknown as IOrchestrationSnapshot);
    const { presenter } = configure({
      snapshot,
      settings: {
        workspaces: [{ id: 'workspace', displayName: 'FLAMOX365', shortCode: 'FL' }],
        repositoryBindings: [],
        agentProfiles: [
          {
            id: 'agent-claude',
            workspaceId: 'workspace',
            displayName: 'Claude Code',
            enabled: true,
          },
          { id: 'agent-codex', workspaceId: 'workspace', displayName: 'Codex', enabled: true },
          { id: 'agent-other', workspaceId: 'other', displayName: 'Elsewhere', enabled: true },
        ],
      } as unknown as Partial<ApplicationSettingsDto>,
    });

    // act
    const agents = presenter.agentRows();

    // assert
    expect(agents.map((agent) => [agent.name, agent.state, agent.workItemKey])).toEqual([
      ['Claude Code', 'working', 'CR-0602'],
      ['Codex', 'idle', undefined],
    ]);
    expect(agents[0]?.runsToday).toBe(1);
  });

  it('opens the latest run of an agent whose goal is blocked', () => {
    // arrange
    const snapshot = signal({
      events: [],
      workItems: [{ id: 'item-1', externalId: '#142' }],
      executions: [
        {
          id: 'execution-old',
          workItemId: 'item-1',
          workflowId: 'workflow',
          state: 'failed',
          startedAt: '2026-10-30T09:00:00Z',
          bindingSnapshot: { agentProfileId: 'agent-1' },
        },
        {
          id: 'execution-new',
          workItemId: 'item-1',
          workflowId: 'workflow',
          state: 'failed',
          startedAt: '2026-10-30T10:00:00Z',
          bindingSnapshot: { agentProfileId: 'agent-1' },
        },
      ],
      goals: [
        {
          workItemId: 'item-1',
          state: 'blocked',
          currentRole: 'solution',
          blockedReason: 'Checks failed',
          updatedAt: '2026-10-30T10:05:00Z',
          assignment: { responsibleAgentId: 'agent-1' },
        },
      ],
    } as unknown as IOrchestrationSnapshot);
    const { presenter } = configure({
      snapshot,
      settings: {
        workspaces: [{ id: 'workspace', displayName: 'Personal', shortCode: 'P' }],
        repositoryBindings: [],
        agentProfiles: [
          { id: 'agent-1', workspaceId: 'workspace', displayName: 'Default agent', enabled: true },
        ],
      } as unknown as Partial<ApplicationSettingsDto>,
    });

    // act
    const [agent] = presenter.agentRows();

    // assert
    expect(agent?.state).toBe('blocked');
    expect(agent?.executionId).toBe('execution-new');
  });

  it('reports the GitHub sync by its slowest source', () => {
    // arrange
    const snapshot = signal({
      remoteData: {
        workItems: { state: 'current' },
        pullRequests: { state: 'current', lastSuccessfulRefreshAt: '2026-10-30T11:58:00Z' },
        ciRuns: { state: 'stale', lastSuccessfulRefreshAt: '2026-10-30T11:40:00Z' },
      },
    } as unknown as IOrchestrationSnapshot);
    const { presenter } = configure({ snapshot });

    // act
    const sync = presenter.syncState();

    // assert
    expect(sync).toEqual({
      state: 'stale',
      lastSuccessfulRefreshAt: '2026-10-30T11:40:00Z',
      rateLimited: false,
    });
  });

  it('synchronises the snapshot and the Actions runs again from the status bar', async () => {
    // arrange
    const { presenter } = configure({});
    const context = TestBed.inject(PRESENTATION_CONTEXT);

    // act
    presenter.synchronizeCommand.execute();
    await Promise.resolve();

    // assert
    expect(context.synchronize).toHaveBeenCalledOnce();
    expect(presenter.syncBusy()).toBe(false);
  });

  it('opens Settings in its own window', () => {
    // arrange
    const { presenter, desktop } = configure({});

    // act
    presenter.openSettingsCommand.execute();

    // assert
    expect(desktop.request).toHaveBeenCalledExactlyOnceWith('settings.open', {});
  });

  it('installs an update only after it is ready and the store is idle', () => {
    // arrange
    const ready = configure({
      updateState: {
        kind: 'ready',
        currentVersion: '0.1.16',
        channel: 'stable',
        targetVersion: '0.1.17',
        downloadedAt: '2026-10-30T11:00:00Z',
      },
    });
    TestBed.resetTestingModule();
    const busy = configure({
      updateBusy: true,
      updateState: {
        kind: 'ready',
        currentVersion: '0.1.16',
        channel: 'stable',
        targetVersion: '0.1.17',
        downloadedAt: '2026-10-30T11:00:00Z',
      },
    });

    // act
    ready.presenter.installUpdateCommand.execute();
    busy.presenter.installUpdateCommand.execute();

    // assert
    expect(ready.install).toHaveBeenCalledOnce();
    expect(busy.install).not.toHaveBeenCalled();
  });

  it('opens the Action named by an Actions deep link once', () => {
    // arrange
    const snapshot = signal({
      executions: [],
      events: [],
      workItems: [],
      ciRuns: [
        {
          id: 'ci:deploy',
          workspaceId: 'workspace',
          ciBindingId: 'ci',
          repositoryBindingId: 'repository',
          name: 'Deploy Dev',
          status: 'failed',
          startedAt: '2026-10-30T10:00:00Z',
        },
      ],
    } as unknown as IOrchestrationSnapshot);
    const { show } = configure({ url: '/main/actions?run=ci%3Adeploy', snapshot });

    // act
    TestBed.flushEffects();
    TestBed.flushEffects();

    // assert
    expect(show).toHaveBeenCalledOnce();
  });
});
