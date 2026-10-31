// @vitest-environment jsdom

// #region Imports

import { TestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import {
  applicationSettingsSchema,
  createDefaultApplicationSettings,
} from '@symphony/configuration-composition';
import { defaultWorkflow } from '@symphony/domain-workflow';
import type { IExecutionEvent } from '@symphony/domain-execution';
import type { IOrchestrationSnapshot } from '@symphony/ipc-contracts-composition';
import type { IWorkItem } from '@symphony/domain-work';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { ORCHESTRATION_CLIENT } from '@symphony/frontend-core';
import { NotificationService } from '@symphony/frontend-notification';
import { WORK_SELECTION } from '@symphony/frontend-core/work';
import {
  OrchestrationState,
  OrchestrationSynchronizer,
} from '@symphony/frontend-core/testing/orchestration';
import { ExecutionSynchronizer } from './ExecutionSynchronizer';
import { provideExecutionFeature } from '../provider/provideExecutionFeature';

// #endregion

const completed: IExecutionEvent = {
  id: 'event-analysis-completed',
  executionId: 'execution-analysis',
  kind: 'analysis.completed',
  message: 'The controlled analysis is ready for implementation.',
  occurredAt: '2026-10-29T14:23:15.707Z',
  sequence: 1,
};

function snapshotAt(stage: 'qualified' | 'ready'): IOrchestrationSnapshot {
  return {
    health: {
      status: 'ready',
      utilityProcess: true,
      database: true,
      homebrew: { available: false },
      git: { available: false },
      githubCli: { available: false },
      agents: {
        codex: { available: false },
        claude: { available: false },
        opencode: { available: false },
      },
    },
    workItems: [
      {
        id: 'work-item-138',
        workspaceId: 'personal',
        sourceId: 'simulated',
        externalId: '#138',
        title: 'Preserve the completed analysis stage',
        body: '',
        detailState: 'summary',
        stageId: stage,
        boardColumnId: stage,
        provider: 'Simulated tracker',
        repository: 'example/platform',
        labels: [],
        assignees: [],
      },
    ],
    boardColumns: [
      { id: 'qualified', label: 'Qualified', stageId: 'qualified' },
      { id: 'ready', label: 'Ready', stageId: 'ready' },
    ],
    executions: [
      {
        id: completed.executionId,
        workItemId: 'work-item-138',
        workspaceId: 'personal',
        workflowId: defaultWorkflow.id,
        kind: 'analysis',
        state: stage === 'ready' ? 'succeeded' : 'running',
        startedAt: '2026-10-29T14:23:11.775Z',
        ...(stage === 'ready'
          ? { summary: completed.message, finishedAt: completed.occurredAt }
          : {}),
      },
    ],
    executionQueue: [],
    goals: [],
    events: stage === 'ready' ? [completed] : [],
    workflow: defaultWorkflow,
    skills: [],
  };
}

function synchronizerWith(send: (method: string, payload?: unknown) => Promise<unknown>) {
  const state = new OrchestrationState();
  const request = vi.fn(send);
  const showError = vi.fn();
  let receive: ((event: IExecutionEvent) => void) | undefined;

  state.settings.set(
    applicationSettingsSchema.parse(createDefaultApplicationSettings('/managed-fixture')),
  );
  state.snapshot.set(snapshotAt('qualified'));
  TestBed.configureTestingModule({
    providers: [
      provideExecutionFeature(),
      { provide: OrchestrationState, useValue: state },
      { provide: WORK_SELECTION, useValue: { ensureDefault: vi.fn() } },
      { provide: NotificationService, useValue: { showError } },
      {
        provide: ORCHESTRATION_CLIENT,
        useValue: {
          request,
          onExecutionEvent: (listener: (event: IExecutionEvent) => void) => {
            receive = listener;

            return () => {
              receive = undefined;
            };
          },
        },
      },
    ],
  });

  const execution = TestBed.inject(ExecutionSynchronizer);
  execution.initialize();

  return {
    execution,
    state,
    request,
    showError,
    synchronizer: TestBed.inject(OrchestrationSynchronizer),
    emit: (event: IExecutionEvent): void => {
      if (!receive) throw new Error('The controlled IPC event subscription is unavailable.');

      receive(event);
    },
  };
}

describe('ExecutionSynchronizer', () => {
  beforeAll(() => TestBed.initTestEnvironment(BrowserTestingModule, platformBrowserTesting()));
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => {
    TestBed.resetTestingModule();
    vi.clearAllTimers();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });
  afterAll(() => TestBed.resetTestEnvironment());

  it('shares one freshness owner across Core refresh failure and execution reconciliation', async () => {
    // arrange
    const { synchronizer, execution } = synchronizerWith(async (method) => {
      if (method === 'snapshot.refresh') throw new Error('The provider is unavailable.');
      if (method === 'execution-state.get') {
        return {
          executions: [],
          executionQueue: [],
          events: [],
          goals: [],
          deliveryGroups: [],
          deliveryGroupProposals: [],
        };
      }
      throw new Error(`Unexpected request: ${method}`);
    });

    // act
    await synchronizer.refresh();

    // assert
    expect(execution.activityFresh()).toBe(false);
    execution.scheduleExecutionStateRefresh(0);
    await vi.advanceTimersByTimeAsync(0);
    expect(execution.activityFresh()).toBe(true);
  });

  it('reconciles the ready card when an older full snapshot arrives after its completion detail', async () => {
    // arrange
    const oldSnapshot = snapshotAt('qualified');
    const readySnapshot = snapshotAt('ready');
    const readyDetail: IWorkItem = {
      ...readySnapshot.workItems[0]!,
      detailState: 'complete',
      body: 'Current task detail.',
    };
    let releaseOld = (): void => undefined;
    const pendingOld = new Promise<IOrchestrationSnapshot>((resolve) => {
      releaseOld = () => resolve(oldSnapshot);
    });
    let fullReads = 0;
    const { state, request, showError, synchronizer, emit } = synchronizerWith(async (method) => {
      if (method === 'work-items.detail') return readyDetail;
      if (method === 'snapshot.refresh') {
        fullReads += 1;

        if (fullReads === 1) return pendingOld;
        if (fullReads === 2) return readySnapshot;
      }

      throw new Error(`Unexpected request: ${method}`);
    });

    // act
    const refresh = synchronizer.refresh();
    emit(completed);
    await Promise.resolve();
    const beforeOldSnapshot = state.scopedWorkItems()[0];
    releaseOld();
    await refresh;

    // assert
    expect(beforeOldSnapshot).toMatchObject({
      stageId: 'ready',
      boardColumnId: 'ready',
      detailState: 'complete',
    });
    expect(state.scopedWorkItems()[0]).toMatchObject({ stageId: 'ready', boardColumnId: 'ready' });
    expect(state.snapshot()?.executions[0]).toMatchObject({
      state: 'succeeded',
      summary: completed.message,
    });
    expect(request.mock.calls.filter(([method]) => method === 'snapshot.refresh')).toHaveLength(2);
    expect(showError).not.toHaveBeenCalled();
  });

  it('updates the completed card without querying providers when no full refresh can overtake it', async () => {
    // arrange
    const readyDetail: IWorkItem = {
      ...snapshotAt('ready').workItems[0]!,
      detailState: 'complete',
      body: 'Current task detail.',
    };
    const { state, request, showError, emit } = synchronizerWith(async (method) => {
      if (method === 'work-items.detail') return readyDetail;

      throw new Error(`Unexpected request: ${method}`);
    });

    // act
    emit(completed);
    await Promise.resolve();

    // assert
    expect(state.scopedWorkItems()[0]).toMatchObject({
      stageId: 'ready',
      boardColumnId: 'ready',
      detailState: 'complete',
    });
    expect(state.snapshot()?.executions[0]).toMatchObject({
      state: 'succeeded',
      summary: completed.message,
    });
    expect(request.mock.calls.map(([method]) => method)).toEqual(['work-items.detail']);
    expect(showError).not.toHaveBeenCalled();
  });
});
