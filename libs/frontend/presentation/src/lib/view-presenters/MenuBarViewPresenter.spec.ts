// @vitest-environment jsdom

// #region Imports
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import {
  applicationSettingsSchema,
  createDefaultApplicationSettings,
} from '@symphony/configuration-composition';
import type { IExecutionRecord } from '@symphony/domain-execution';
import { INBOX_SUMMARY, ORCHESTRATION_CLIENT, type IInboxSummary } from '@symphony/frontend-core';
import { ApplicationBootstrap } from '@symphony/frontend-core/bootstrap';
import { DESKTOP_CLIENT } from '@symphony/frontend-core/desktop';
import { OrchestrationSynchronizer } from '@symphony/frontend-core/synchronization';
import { provideAutomationFeature } from '@symphony/frontend-feature-automation';
import { provideCiFeature } from '@symphony/frontend-feature-ci';
import { provideExecutionFeature } from '@symphony/frontend-feature-execution';
import { provideWorkspaceFeature } from '@symphony/frontend-feature-workspace';
import {
  NOTIFICATION_SOURCES,
  NotificationCentre,
  NotificationHistory,
  NotificationService,
  type INotificationItem,
} from '@symphony/frontend-notification';
import type {
  IOrchestrationApi,
  RequestMethod,
  RequestPayload,
  ResponsePayload,
} from '@symphony/ipc-contracts-composition';
import type { IDesktopApi } from '@symphony/ipc-contracts-desktop';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { MenuBarViewPresenter } from './MenuBarViewPresenter';
// #endregion

type RequestHandlers = {
  [M in RequestMethod]?: (payload: RequestPayload<M>) => Promise<ResponsePayload<M>>;
};

const CI_RUN_BASE = {
  workspaceId: 'workspace-1',
  ciBindingId: 'ci-1',
  repositoryBindingId: 'repository-1',
  workflowId: 'workflow-1',
  branch: 'dev',
  revision: '4f2a91c0',
  runAttempt: 1,
};

function arrange(
  options: {
    omitted?: readonly string[];
    executions?: readonly IExecutionRecord[];
    attention?: readonly INotificationItem[];
    inbox?: IInboxSummary;
    ciRuns?: readonly object[];
  } = {},
) {
  const omitted = options.omitted ?? [];
  const settings = applicationSettingsSchema.parse(createDefaultApplicationSettings('/menu'));
  const execution: ResponsePayload<'execution.pause'> = {
    id: 'execution-1',
    workItemId: 'work-1',
    workflowId: 'workflow-1',
    state: 'running',
    startedAt: '2026-10-30T10:00:00.000Z',
  };
  const autonomy = { enabled: true, maximum: 3, active: 1, available: 2 };
  const requests: RequestMethod[] = [];
  const handlers: RequestHandlers = {
    'settings.get': async () => ({
      ...settings,
      ciBindings: [
        {
          id: 'ci-1',
          repositoryBindingId: 'repository-1',
          provider: 'github-actions',
          enabled: true,
          workspaceId: 'workspace-1',
          sourceControlConnectionId: 'source-1',
          displayName: 'Actions',
          agenticDeliveryEnabled: false,
        },
      ],
    }),
    'execution-state.get': async () =>
      ({
        executions: options.executions ?? [execution],
        executionQueue: [],
        events: [],
        goals: [],
      }) as ResponsePayload<'execution-state.get'>,
    'autonomy.status.get': async () => autonomy,
    'autonomy.set-enabled': async ({ enabled }) => ({ ...autonomy, enabled }),
    'repositories.runtime.list': async () => [],
    'storage.status.get': async () => {
      throw new Error('Storage is measured elsewhere in this test.');
    },
    'ci.runs.refresh': async () =>
      ({
        ciWorkflows: [],
        ciRuns: options.ciRuns ?? [],
        localCiExecutions: [],
        remoteData: { state: 'current' },
      }) as ResponsePayload<'ci.runs.refresh'>,
    'execution.pause': async () => execution,
    'execution.resume': async () => execution,
  };
  let listener: Parameters<IOrchestrationApi['onExecutionEvent']>[0] | undefined;
  const unsubscribe = vi.fn();
  const client: IOrchestrationApi = {
    request<M extends RequestMethod>(
      method: M,
      payload: RequestPayload<M>,
    ): Promise<ResponsePayload<M>> {
      requests.push(method);
      const handler = handlers[method];
      if (!handler) return Promise.reject(new Error(`Unexpected menu request: ${method}`));
      return handler(payload);
    },
    onExecutionEvent: (callback) => {
      listener = callback;
      return unsubscribe;
    },
    selectPath: async () => ({ canceled: true, paths: [] }),
  };
  const windowRoutes: string[] = [];
  const desktop: IDesktopApi = {
    capabilities: { speechRecognition: false },
    request: (async (method: string, payload: { route?: string }) => {
      if (method === 'window.show') {
        windowRoutes.push(payload.route ?? 'current');
        return { completed: true };
      }
      throw new Error('Native status delivery is outside these request-session assertions.');
    }) as IDesktopApi['request'],
    onUpdateState: () => () => undefined,
    onPowerState: () => () => undefined,
    onSpeechRecognitionEvent: () => () => undefined,
    onNavigate: () => () => undefined,
  };
  const features = [
    { id: 'execution', providers: provideExecutionFeature() },
    { id: 'ci', providers: provideCiFeature() },
    { id: 'automation', providers: provideAutomationFeature() },
    { id: 'workspace', providers: provideWorkspaceFeature() },
  ];
  TestBed.configureTestingModule({
    providers: [
      ...features
        .filter((feature) => !omitted.includes(feature.id))
        .map((feature) => feature.providers),
      MenuBarViewPresenter,
      NotificationHistory,
      NotificationCentre,
      ...(options.attention
        ? [
            {
              provide: NOTIFICATION_SOURCES,
              useValue: { items: signal(options.attention).asReadonly(), perform: vi.fn() },
              multi: true,
            },
          ]
        : []),
      ...(options.inbox ? [{ provide: INBOX_SUMMARY, useValue: options.inbox }] : []),
      { provide: ORCHESTRATION_CLIENT, useValue: client },
      { provide: DESKTOP_CLIENT, useValue: desktop },
      {
        provide: NotificationService,
        useValue: {
          showError: vi.fn(),
          showWarning: vi.fn(),
          showSuccess: vi.fn(),
          showInfo: vi.fn(),
        },
      },
      {
        provide: ApplicationBootstrap,
        useFactory: () => {
          throw new Error('The menu must not initialize the desktop application.');
        },
      },
      {
        provide: OrchestrationSynchronizer,
        useFactory: () => {
          throw new Error('The menu must not construct desktop snapshot synchronization.');
        },
      },
    ],
  });
  return {
    presenter: TestBed.inject(MenuBarViewPresenter),
    requests,
    autonomy,
    unsubscribe,
    windowRoutes,
    hasExecutionListener: () => listener !== undefined,
    emit: () =>
      listener?.({
        id: 'event-1',
        executionId: execution.id,
        kind: 'agent.progress',
        message: 'Working',
        occurredAt: execution.startedAt,
        sequence: 1,
      }),
  };
}

describe('MenuBarViewPresenter', () => {
  beforeAll(() => TestBed.initTestEnvironment(BrowserTestingModule, platformBrowserTesting()));
  afterEach(() => {
    TestBed.resetTestingModule();
    vi.useRealTimers();
  });
  afterAll(() => TestBed.resetTestEnvironment());

  it('loads settings, runs and the notification sources without hydrating the application', async () => {
    // arrange
    const { presenter, requests, autonomy, emit } = arrange();
    // act
    await presenter.initialize();
    // assert
    expect(requests).toEqual([
      'settings.get',
      'execution-state.get',
      'autonomy.status.get',
      'ci.runs.refresh',
      'storage.status.get',
      'repositories.runtime.list',
    ]);
    expect(presenter.capacity()).toEqual(autonomy);
    expect(presenter.loading()).toBe(false);
    expect(presenter.error()).toBeUndefined();
    requests.length = 0;
    emit();
    await Promise.resolve();
    expect(requests).toEqual(['execution-state.get', 'autonomy.status.get']);
  });

  it.each([
    ['execution', ['execution-state.get']],
    ['ci', ['ci.runs.refresh']],
    ['automation', ['autonomy.status.get', 'storage.status.get']],
    ['workspace', ['repositories.runtime.list']],
  ] as const)(
    'does not query the omitted %s owner while retaining the other panel data',
    async (omitted, omittedMethods) => {
      // arrange
      const { presenter, requests } = arrange({ omitted: [omitted] });
      // act
      await presenter.initialize();
      // assert
      for (const method of omittedMethods) expect(requests).not.toContain(method);
      expect(requests).toContain('settings.get');
      expect(presenter.executionAvailable).toBe(omitted !== 'execution');
      expect(presenter.ciAvailable).toBe(omitted !== 'ci');
      expect(presenter.autonomyAvailable).toBe(omitted !== 'automation');
    },
  );

  it('keeps the minimal panel usable without subscribing or polling omitted feature owners', async () => {
    // arrange
    vi.useFakeTimers();
    const { presenter, requests, hasExecutionListener } = arrange({
      omitted: ['execution', 'ci', 'automation', 'workspace'],
    });
    // act
    await presenter.initialize();
    await vi.advanceTimersByTimeAsync(60_000);
    presenter.pauseExecutionCommand.execute('execution-1');
    presenter.enableAutonomyCommand.execute();
    // assert
    expect(requests).toEqual(['settings.get']);
    expect(hasExecutionListener()).toBe(false);
    expect(presenter.pauseExecutionCommand.canExecute()).toBe(false);
    expect(presenter.enableAutonomyCommand.canExecute()).toBe(false);
    expect(presenter.selectedRunView()).toBe('actions');
    expect(presenter.loading()).toBe(false);
  });

  it('retains CI refresh scheduling only while the CI owner is selected', async () => {
    // arrange
    vi.useFakeTimers();
    const { presenter, requests, unsubscribe } = arrange();
    await presenter.initialize();
    requests.length = 0;
    // act
    await vi.advanceTimersByTimeAsync(60_000);
    // assert
    expect(requests).toEqual(['ci.runs.refresh']);
    TestBed.resetTestingModule();
    expect(unsubscribe).toHaveBeenCalledOnce();
    requests.length = 0;
    await vi.advanceTimersByTimeAsync(120_000);
    expect(requests).toEqual([]);
  });

  it('retains pause and resume through the isolated controls followed by its own runtime refresh', async () => {
    // arrange
    const { presenter, requests } = arrange();
    // act
    presenter.pauseExecutionCommand.execute('execution-1');
    await vi.waitFor(() => expect(presenter.executionBusy()).toBeUndefined());
    // assert
    expect(requests).toEqual(['execution.pause', 'execution-state.get', 'autonomy.status.get']);
    requests.length = 0;
    presenter.resumeExecutionCommand.execute('execution-1');
    await vi.waitFor(() => expect(presenter.executionBusy()).toBeUndefined());
    expect(requests).toEqual(['execution.resume', 'execution-state.get', 'autonomy.status.get']);
  });

  it('lists the working agent of the active workspace with its work item and pause control', async () => {
    // arrange
    const working = {
      id: 'execution-2',
      workItemId: 'work-602',
      workflowId: 'workflow-1',
      kind: 'solution',
      state: 'running',
      startedAt: '2026-10-30T10:00:00.000Z',
      bindingSnapshot: { agentProfileId: 'personal-default-agent' },
      workItemSnapshot: { externalId: 'CR-0602', title: 'New Relic: reduce ingest' },
    } as unknown as IExecutionRecord;
    const { presenter } = arrange({ executions: [working] });
    // act
    await presenter.initialize();
    // assert
    expect(presenter.agentRows()).toEqual([
      expect.objectContaining({
        id: 'personal-default-agent',
        name: 'Default agent',
        state: 'working',
        role: 'solution',
        workItemKey: 'CR-0602',
        workItemTitle: 'New Relic: reduce ingest',
        executionId: 'execution-2',
      }),
    ]);
    expect(presenter.activeAgentCount()).toBe(1);
    expect(presenter.pausableExecutionIds().has('execution-2')).toBe(true);
    expect(presenter.runningCount()).toBe(1);
    expect(presenter.menuBarStatus()).toBe('running');
  });

  it('lists running and queued action runs first and fills up with finished runs', async () => {
    // arrange
    const run = (id: string, status: string, minute: number) => ({
      ...CI_RUN_BASE,
      id,
      name: id,
      status,
      startedAt: `2026-10-30T10:0${minute}:00.000Z`,
      ...(status === 'in-progress' ? {} : { finishedAt: `2026-10-30T10:0${minute}:30.000Z` }),
    });
    const { presenter } = arrange({
      executions: [],
      ciRuns: [
        run('failed-1', 'failed', 5),
        run('running-1', 'in-progress', 1),
        run('queued-1', 'queued', 2),
        run('done-1', 'succeeded', 4),
        run('done-2', 'succeeded', 3),
        run('done-3', 'succeeded', 0),
      ],
    });
    // act
    await presenter.initialize();
    // assert
    expect(presenter.actionRows().map((entry) => entry.title)).toEqual([
      'queued-1',
      'running-1',
      'failed-1',
      'done-1',
    ]);
    expect(presenter.activeActionRunCount()).toBe(2);
  });

  it('links what needs the user to the main window', async () => {
    // arrange
    const attention: INotificationItem = {
      id: 'developer-tools:codex',
      severity: 'error',
      title: 'Codex CLI is not installed',
      location: ['System', 'Developer tools'],
      scope: { kind: 'mac' },
      actions: [],
    };
    const inbox: IInboxSummary = {
      decisionCount: signal(4),
      firstDecisionTitle: signal('Choose how CR-0589 continues'),
      refresh: vi.fn(async () => undefined),
    };
    const { presenter, windowRoutes } = arrange({ attention: [attention], inbox });
    // act
    await presenter.initialize();
    presenter.openInboxCommand.execute();
    presenter.openNotificationsCommand.execute();
    presenter.newWorkItemCommand.execute();
    presenter.openSettingsCommand.execute();
    presenter.openAllRunsCommand.execute();
    presenter.openSymphonyCommand.execute();
    await Promise.resolve();
    // assert
    expect(inbox.refresh).toHaveBeenCalledOnce();
    expect(presenter.notifications.attentionCount()).toBe(1);
    expect(windowRoutes).toEqual([
      'inbox',
      'notifications',
      'new-work-item',
      'settings',
      'actions',
      'current',
    ]);
  });

  it('switches the run segment', () => {
    // arrange
    const { presenter } = arrange();
    // act
    presenter.selectRunViewCommand.execute('actions');
    // assert
    expect(presenter.selectedRunView()).toBe('actions');
  });
});
