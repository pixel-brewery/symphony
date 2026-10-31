// @vitest-environment jsdom

// #region Imports

import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import type { RequestPayload, ResponsePayload } from '@symphony/ipc-contracts-composition';
import type { IExecutionProjectionValue } from '@symphony/frontend-core/execution';
import { NotificationService } from '@symphony/frontend-notification';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { IExecutionClient } from '../ports/IExecutionClient';
import type { ExecutionRequestMethod } from '../ports/ExecutionRequestMethod';
import type { IExecutionContext } from '../ports/IExecutionContext';
import type { IExecutionProjection } from '../ports/IExecutionProjection';
import type { IExecutionRefresh } from '../ports/IExecutionRefresh';
import type { IExecutionSynchronization } from '../ports/IExecutionSynchronization';
import { EXECUTION_CLIENT } from '../ports/ExecutionClientToken';
import { EXECUTION_CONTEXT } from '../ports/ExecutionContextToken';
import { EXECUTION_PROJECTION } from '../ports/ExecutionProjectionToken';
import { EXECUTION_REFRESH } from '../ports/ExecutionRefreshToken';
import { EXECUTION_RUNTIME } from '../ports/ExecutionRuntimeToken';
import { EXECUTION_PUBLICATION } from '../ports/ExecutionPublicationToken';
import { EXECUTION_SYNCHRONIZATION } from '../ports/ExecutionSynchronizationToken';
import { ExecutionStore } from './ExecutionStore';

// #endregion

function snapshotWith(boardColumnId: string): IExecutionProjectionValue {
  return {
    workItems: [
      {
        id: 'PVTI_1',
        workspaceId: 'personal',
        sourceId: 'project',
        externalId: '#18',
        title: 'Period picker',
        body: '',
        detailState: 'summary',
        bodyFormat: 'markdown',
        stageId: 'ready',
        boardColumnId,
        provider: 'github-projects',
        repository: 'example/platform',
        repositoryBindingIds: ['repository'],
        projectFields: [],
        labels: [],
        assignees: [],
      },
    ],
    executions: [],
    executionQueue: [],
    events: [],
  };
}

function storeWith(
  analysis?: () => Promise<ResponsePayload<'analysis.complete-manually'>>,
  solution?: () => Promise<ResponsePayload<'solution.complete-manually'>>,
) {
  const snapshot = signal<IExecutionProjectionValue | undefined>(snapshotWith('ready'));
  const state = { snapshot };
  const refresh = vi.fn<() => Promise<void>>().mockResolvedValue(undefined);
  const handlers: Partial<{
    [M in ExecutionRequestMethod]: (payload: RequestPayload<M>) => Promise<ResponsePayload<M>>;
  }> = {
    ...(analysis ? { 'analysis.complete-manually': analysis } : {}),
    ...(solution ? { 'solution.complete-manually': solution } : {}),
  };
  const context: IExecutionContext = {
    projection: snapshot.asReadonly(),
    agentProfiles: signal([]),
  };
  const projection: IExecutionProjection = { update: (update) => snapshot.update(update) };
  const refreshPort: IExecutionRefresh = {
    refresh,
    repeatAfterActiveRefresh: () => () => undefined,
  };
  const activityFresh = signal(true);
  const synchronization: IExecutionSynchronization = {
    activityFresh,
    initialize: vi.fn(),
    scheduleExecutionStateRefresh: vi.fn(),
    markActivityFresh: (fresh) => activityFresh.set(fresh),
  };
  const client: IExecutionClient = {
    async request<M extends ExecutionRequestMethod>(
      method: M,
      payload: RequestPayload<M>,
    ): Promise<ResponsePayload<M>> {
      const handler = handlers[method];
      if (!handler) throw new Error('Unexpected request: ' + method);
      return handler(payload);
    },
    onExecutionEvent: () => () => undefined,
  };
  TestBed.configureTestingModule({
    providers: [
      ExecutionStore,
      { provide: EXECUTION_CONTEXT, useValue: context },
      { provide: EXECUTION_PROJECTION, useValue: projection },
      { provide: EXECUTION_REFRESH, useValue: refreshPort },
      {
        provide: EXECUTION_RUNTIME,
        useValue: { refreshRepositoryRuntime: vi.fn().mockResolvedValue(true) },
      },
      {
        provide: EXECUTION_PUBLICATION,
        useValue: { publishPullRequest: vi.fn().mockResolvedValue(true) },
      },
      { provide: EXECUTION_SYNCHRONIZATION, useValue: synchronization },
      { provide: EXECUTION_CLIENT, useValue: client },
      {
        provide: NotificationService,
        useValue: { showError: vi.fn(), showInfo: vi.fn(), showSuccess: vi.fn() },
      },
    ],
  });
  return { refresh, state, store: TestBed.inject(ExecutionStore) };
}

describe('ExecutionStore', () => {
  beforeAll(() => TestBed.initTestEnvironment(BrowserTestingModule, platformBrowserTesting()));
  beforeEach(() => TestBed.resetTestingModule());
  afterAll(() => TestBed.resetTestEnvironment());

  it('shows the routed implementation stage after recording a manual analysis', async () => {
    // arrange
    const execution: ResponsePayload<'analysis.complete-manually'> = {
      id: 'execution-1',
      workItemId: 'PVTI_1',
      workflowId: 'workflow-1',
      mode: 'manual',
      kind: 'analysis',
      state: 'succeeded',
      startedAt: '2026-09-04T10:00:00.000Z',
      finishedAt: '2026-09-04T10:00:00.000Z',
      summary: 'Ready to implement.',
    };
    const { refresh, state, store } = storeWith(async () => execution);
    state.snapshot.update((snapshot) =>
      snapshot
        ? {
            ...snapshot,
            workItems: snapshot.workItems.map((item) => ({
              ...item,
              stageId: 'qualified',
              boardColumnId: 'qualified',
            })),
          }
        : snapshot,
    );
    refresh.mockImplementation(async () => {
      state.snapshot.update((snapshot) =>
        snapshot
          ? {
              ...snapshot,
              workItems: snapshot.workItems.map((item) => ({
                ...item,
                stageId: 'ready',
                boardColumnId: 'ready',
              })),
            }
          : snapshot,
      );
    });

    // act
    const completed = await store.completeManualAnalysis('PVTI_1', 'Ready to implement.');

    // assert
    expect(completed).toBe(true);
    expect(state.snapshot()?.workItems[0]).toMatchObject({
      stageId: 'ready',
      boardColumnId: 'ready',
    });
    expect(state.snapshot()?.executions).toContainEqual(execution);
  });

  it('reconciles goal evidence after recording a manual implementation', async () => {
    // arrange
    const execution: ResponsePayload<'solution.complete-manually'> = {
      id: 'execution-2',
      workItemId: 'PVTI_1',
      workflowId: 'workflow-1',
      mode: 'manual',
      kind: 'solution',
      state: 'succeeded',
      startedAt: '2026-09-04T10:05:00.000Z',
      finishedAt: '2026-09-04T10:05:00.000Z',
      summary: 'Implemented and verified manually.',
    };
    const { refresh, state, store } = storeWith(undefined, async () => execution);

    // act
    const completed = await store.completeManualSolution(
      'PVTI_1',
      'Implemented and verified manually.',
    );

    // assert
    expect(completed).toBe(true);
    expect(refresh).toHaveBeenCalledOnce();
    expect(state.snapshot()?.executions).toContainEqual(execution);
  });
});
