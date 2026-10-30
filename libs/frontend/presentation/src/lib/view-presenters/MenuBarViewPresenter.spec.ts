// @vitest-environment jsdom

// #region Imports
import { TestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import {
  applicationSettingsSchema,
  createDefaultApplicationSettings,
} from '@symphony/configuration-composition';
import { ORCHESTRATION_CLIENT } from '@symphony/frontend-core';
import { ApplicationBootstrap } from '@symphony/frontend-core/bootstrap';
import { DESKTOP_CLIENT } from '@symphony/frontend-core/desktop';
import { OrchestrationSynchronizer } from '@symphony/frontend-core/synchronization';
import { provideAutomationFeature } from '@symphony/frontend-feature-automation';
import { provideCiFeature } from '@symphony/frontend-feature-ci';
import { provideExecutionFeature } from '@symphony/frontend-feature-execution';
import { provideWorkspaceFeature } from '@symphony/frontend-feature-workspace';
import { NotificationService } from '@symphony/frontend-notification';
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

function arrange(omitted: readonly string[] = []) {
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
    'execution-state.get': async () => ({
      executions: [execution],
      executionQueue: [],
      events: [],
      goals: [],
    }),
    'autonomy.status.get': async () => autonomy,
    'autonomy.set-enabled': async ({ enabled }) => ({ ...autonomy, enabled }),
    'repositories.runtime.list': async () => [],
    'ci.runs.refresh': async () => ({
      ciWorkflows: [],
      ciRuns: [],
      localCiExecutions: [],
      remoteData: { state: 'current' },
    }),
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
  const desktop: IDesktopApi = {
    capabilities: { speechRecognition: false },
    request: async () => {
      throw new Error('Native status delivery is outside these request-session assertions.');
    },
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

  it('keeps the all-feature request order and its independent execution/autonomy event refresh', async () => {
    // arrange
    const { presenter, requests, autonomy, emit } = arrange();
    // act
    await presenter.initialize();
    // assert
    expect(requests).toEqual([
      'settings.get',
      'execution-state.get',
      'autonomy.status.get',
      'repositories.runtime.list',
      'ci.runs.refresh',
    ]);
    expect(presenter.capacity()).toEqual(autonomy);
    expect(presenter.loading()).toBe(false);
    expect(
      presenter.executionAvailable && presenter.ciAvailable && presenter.autonomyAvailable,
    ).toBe(true);
    requests.length = 0;
    emit();
    await Promise.resolve();
    expect(requests).toEqual(['execution-state.get', 'autonomy.status.get']);
  });

  it.each(['execution', 'ci', 'automation', 'workspace'] as const)(
    'does not query the omitted %s owner while retaining the other menu data',
    async (omitted) => {
      // arrange
      const { presenter, requests, emit } = arrange([omitted]);
      const omittedMethods = {
        execution: 'execution-state.get',
        ci: 'ci.runs.refresh',
        automation: 'autonomy.status.get',
        workspace: 'repositories.runtime.list',
      } as const;
      // act
      await presenter.initialize();
      // assert
      expect(requests).not.toContain(omittedMethods[omitted]);
      expect(requests).toHaveLength(4);
      expect(presenter.executionAvailable).toBe(omitted !== 'execution');
      expect(presenter.ciAvailable).toBe(omitted !== 'ci');
      expect(presenter.autonomyAvailable).toBe(omitted !== 'automation');
      requests.length = 0;
      emit();
      await Promise.resolve();
      expect(requests).toEqual([
        ...(omitted === 'execution' ? [] : ['execution-state.get']),
        ...(omitted === 'automation' ? [] : ['autonomy.status.get']),
      ]);
    },
  );

  it('keeps the minimal menu usable without subscribing or polling omitted feature owners', async () => {
    // arrange
    vi.useFakeTimers();
    const { presenter, requests, hasExecutionListener } = arrange([
      'execution',
      'ci',
      'automation',
      'workspace',
    ]);
    // act
    await presenter.initialize();
    await vi.advanceTimersByTimeAsync(60_000);
    presenter.pauseExecutionCommand.execute('execution-1');
    presenter.enableAutonomyCommand.execute();
    // assert
    expect(requests).toEqual(['settings.get']);
    expect(hasExecutionListener()).toBe(false);
    expect(presenter.pauseExecutionCommand.canExecute()).toBe(false);
    expect(presenter.resumeExecutionCommand.canExecute()).toBe(false);
    expect(presenter.enableAutonomyCommand.canExecute()).toBe(false);
    expect(presenter.disableAutonomyCommand.canExecute()).toBe(false);
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
});
