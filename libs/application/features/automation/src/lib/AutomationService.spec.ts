// #region Imports

import { describe, expect, it, vi } from 'vitest';
import type { IContinuousIntegrationPort } from '@symphony/application-ci';
import { WorkflowEngineService } from '@symphony/application-workflow';
import {
  defaultAgenticDeliveryPolicy,
  type IAgenticDeliveryPolicy,
  type IAgenticDeliveryRecord,
  type IAutomationReceipt,
  type IAutomationSignal,
  type IAutomationSourceCheckpoint,
} from '@symphony/domain-automation';
import type { ICiRun } from '@symphony/domain-ci';
import type { IPullRequestStatus, PullRequestBaseBranchStatus } from '@symphony/domain-delivery';
import type { IDeliveryGroup, IExecutionRecord, IGoalRecord } from '@symphony/domain-execution';
import type { IWorkItem } from '@symphony/domain-work';
import {
  defaultWorkflow,
  type IAnalysisArtifact,
  type IWorkflowRecord,
} from '@symphony/domain-workflow';
import { AutomationService } from './AutomationService';
import type { IAutomationExecutionRepository } from './IAutomationExecutionRepository';
import type { IAutomationExecutionTrigger } from './IAutomationExecutionTrigger';
import type { IAutomationRepository } from './IAutomationRepository';
import type { IAutonomousCycleResult } from './IAutonomousCycleResult';

// #endregion

interface IAutomationTestRepository extends IAutomationRepository, IAutomationExecutionRepository {
  saveGoal(goal: IGoalRecord): void;
}

function createMemoryExecutionRepository(): IAutomationTestRepository {
  const executions: IExecutionRecord[] = [];
  const receipts: IAutomationReceipt[] = [];
  const checkpoints: IAutomationSourceCheckpoint[] = [];
  const deliveries: IAgenticDeliveryRecord[] = [];
  const deliveryGroups: IDeliveryGroup[] = [];
  const goals: IGoalRecord[] = [];

  return {
    saveExecution: (execution) => upsert(executions, execution, (value) => value.id),
    listExecutions: () => [...executions].reverse(),
    saveAutomationReceipt: (receipt) => upsert(receipts, receipt, (value) => value.signalId),
    listAutomationReceipts: () => [...receipts],
    saveAutomationCheckpoint: (checkpoint) =>
      upsert(checkpoints, checkpoint, (value) => value.sourceId),
    listAutomationCheckpoints: () => [...checkpoints],
    saveAgenticDelivery: (delivery) => upsert(deliveries, delivery, (value) => value.id),
    listAgenticDeliveries: () => [...deliveries],
    saveDeliveryGroup: (group) => upsert(deliveryGroups, group, (value) => value.id),
    listDeliveryGroups: () => [...deliveryGroups],
    saveGoal: (goal) => upsert(goals, goal, (value) => value.id),
    listGoals: () => [...goals],
  };
}

function upsert<T>(values: T[], value: T, keyOf: (candidate: T) => string): void {
  const index = values.findIndex((candidate) => keyOf(candidate) === keyOf(value));
  if (index >= 0) values.splice(index, 1);
  values.push(value);
}

const workItem: IWorkItem = {
  id: 'project-item-1',
  workspaceId: 'personal',
  sourceId: 'project',
  externalId: '#18',
  title: 'Repair formatting',
  body: 'Run the formatter and update the pull request.',
  stageId: 'qualified',
  provider: 'github-projects',
  repository: 'example/platform',
  repositoryBindingIds: ['repository'],
  labels: [],
  assignees: [],
};

function signal(id: string, item: IWorkItem = workItem): IAutomationSignal {
  return {
    id,
    sourceId: 'project',
    workspaceId: 'personal',
    workItem: item,
    origin: 'comment',
    action: 'synchronize',
    occurredAt: '2026-08-11T10:00:00Z',
    actorLogin: 'octocat',
    request: 'Run the formatter.',
    externalCommentId: '91',
  };
}

function fixture(
  initialSignals: readonly IAutomationSignal[] = [],
  ci?: IContinuousIntegrationPort,
) {
  const repository = createMemoryExecutionRepository();
  let signals = initialSignals;
  let sequence = 0;
  const acknowledge = vi.fn(async () => undefined);
  const listAutomationSignals = vi.fn(async () => signals);
  const startForWorkItem = vi.fn(
    async (item: IWorkItem, request?: string, trigger?: IAutomationExecutionTrigger) => {
      const execution: IExecutionRecord = {
        id: `analysis-${++sequence}`,
        workspaceId: item.workspaceId,
        workItemId: item.id,
        workflowId: 'default',
        kind: 'analysis',
        state: 'running',
        startedAt: '2026-08-11T10:01:00Z',
        request,
        automationOrigin: trigger?.origin,
        automationSignalId: trigger?.signalId,
        triggeredBy: trigger?.actorLogin,
      };
      repository.saveExecution(execution);
      return execution;
    },
  );
  const startSolutionForWorkItem = vi.fn(
    async (item: IWorkItem, request?: string, trigger?: IAutomationExecutionTrigger) => {
      const execution: IExecutionRecord = {
        id: `solution-${++sequence}`,
        workspaceId: item.workspaceId,
        workItemId: item.id,
        workflowId: 'default',
        kind: 'revision',
        state: 'running',
        startedAt: '2026-08-11T10:01:00Z',
        request,
        automationOrigin: trigger?.origin,
        automationSignalId: trigger?.signalId,
        triggeredBy: trigger?.actorLogin,
      };
      repository.saveExecution(execution);
      return execution;
    },
  );
  const service = new AutomationService({
    workflow: () => defaultWorkflow,
    tracker: {
      listWorkItems: async () => [],
      listAutomationSources: async () => [{ sourceId: 'project', workspaceId: 'personal' }],
      listAutomationSignals,
      acknowledgeAutomationSignal: acknowledge,
    },
    executions: { startForWorkItem, startSolutionForWorkItem },
    repository,
    executionRepository: repository,
    clock: { now: () => '2026-08-11T10:02:00Z' },
    enabled: () => true,
    ci,
  });
  return {
    service,
    repository,
    acknowledge,
    listAutomationSignals,
    startForWorkItem,
    startSolutionForWorkItem,
    setSignals: (value: readonly IAutomationSignal[]) => {
      signals = value;
    },
  };
}

describe('AutomationService', () => {
  it('checkpoints an empty source and starts its first later instruction exactly once', async () => {
    // act
    // arrange
    const test = fixture();

    // assert
    await expect(test.service.synchronize()).resolves.toMatchObject({ observed: 0, baselined: 0 });
    expect(test.repository.listAutomationCheckpoints()).toEqual([
      expect.objectContaining({
        sourceId: 'project',
        workspaceId: 'personal',
        synchronizedAt: '2026-08-11T10:02:00Z',
      }),
    ]);

    test.setSignals([signal('comment-1')]);
    await expect(test.service.synchronize()).resolves.toMatchObject({ started: 1 });
    await expect(test.service.synchronize()).resolves.toMatchObject({ started: 0 });

    expect(test.startForWorkItem).toHaveBeenCalledTimes(1);
    expect(test.repository.listAutomationReceipts()).toEqual([
      expect.objectContaining({ signalId: 'comment-1', state: 'started' }),
    ]);
    expect(test.acknowledge).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'comment-1' }),
      'started',
    );
    expect(test.listAutomationSignals).toHaveBeenNthCalledWith(
      2,
      expect.arrayContaining([expect.objectContaining({ synchronizedAt: '2026-08-11T10:02:00Z' })]),
    );
  });

  it('records existing instructions as a baseline without executing them', async () => {
    // act
    // arrange
    const test = fixture([signal('old-comment')]);

    // assert
    await expect(test.service.synchronize()).resolves.toMatchObject({ baselined: 1, started: 0 });

    expect(test.startForWorkItem).not.toHaveBeenCalled();
    expect(test.repository.listAutomationReceipts()[0]).toMatchObject({
      signalId: 'old-comment',
      state: 'baselined',
    });
  });

  it('uses the completed analysis when an executing issue requests remote rework', async () => {
    // arrange
    const test = fixture();
    await test.service.synchronize();
    test.repository.saveExecution({
      id: 'analysis-complete',
      workspaceId: 'personal',
      workItemId: workItem.id,
      workflowId: 'default',
      kind: 'analysis',
      state: 'succeeded',
      startedAt: '2026-08-11T09:00:00Z',
      finishedAt: '2026-08-11T09:01:00Z',
      summary: 'Approved plan.',
    });
    // act
    test.setSignals([signal('comment-2', { ...workItem, stageId: 'progress' })]);

    // assert
    await expect(test.service.synchronize()).resolves.toMatchObject({ started: 1 });

    expect(test.startForWorkItem).not.toHaveBeenCalled();
    expect(test.startSolutionForWorkItem).toHaveBeenCalledWith(
      expect.objectContaining({ stageId: 'progress' }),
      'Run the formatter.',
      expect.objectContaining({ origin: 'remote', signalId: 'comment-2' }),
    );
  });

  it('allows an explicit remote instruction for an autonomy-excluded issue', async () => {
    // arrange
    const test = fixture();
    await test.service.synchronize();
    // act
    test.setSignals([signal('comment-excluded', { ...workItem, labels: ['autonomy:excluded'] })]);

    // assert
    await expect(test.service.synchronize()).resolves.toMatchObject({ started: 1 });

    expect(test.startForWorkItem).toHaveBeenCalledWith(
      expect.objectContaining({ labels: ['autonomy:excluded'] }),
      'Run the formatter.',
      expect.objectContaining({ origin: 'remote', signalId: 'comment-excluded' }),
    );
  });

  it('recovers a processing receipt from the execution trigger without starting twice', async () => {
    // arrange
    const pending = signal('comment-recovered');
    const test = fixture([pending]);
    test.repository.saveAutomationCheckpoint({
      sourceId: 'project',
      workspaceId: 'personal',
      initializedAt: '2026-08-11T09:00:00Z',
    });
    test.repository.saveAutomationReceipt({
      signalId: pending.id,
      sourceId: pending.sourceId,
      workspaceId: pending.workspaceId,
      workItemId: pending.workItem.id,
      action: pending.action,
      state: 'processing',
      observedAt: '2026-08-11T09:00:00Z',
      updatedAt: '2026-08-11T09:00:00Z',
    });
    // act
    test.repository.saveExecution({
      id: 'execution-recovered',
      workspaceId: 'personal',
      workItemId: pending.workItem.id,
      workflowId: 'default',
      state: 'running',
      startedAt: '2026-08-11T09:00:00Z',
      automationSignalId: pending.id,
    });

    // assert
    await expect(test.service.synchronize()).resolves.toMatchObject({ started: 1 });

    expect(test.startForWorkItem).not.toHaveBeenCalled();
    expect(test.repository.listAutomationReceipts()[0]).toMatchObject({
      state: 'started',
      executionId: 'execution-recovered',
    });
  });

  it('reruns the newest failed CI run for the work-item repository', async () => {
    // arrange
    const rerun = vi.fn(async () => undefined);
    const test = fixture([], {
      listRuns: async () => [
        {
          id: 'ci:44',
          workspaceId: 'personal',
          ciBindingId: 'ci',
          repositoryBindingId: 'repository',
          name: 'verify',
          status: 'failed',
          branch: 'codex/issue-18',
          finishedAt: '2026-08-11T10:00:00Z',
        },
      ],
      rerun,
    });
    await test.service.synchronize();
    test.repository.saveExecution({
      id: 'solution-branch',
      workspaceId: 'personal',
      workItemId: workItem.id,
      workflowId: 'default',
      kind: 'solution',
      state: 'succeeded',
      startedAt: '2026-08-11T09:00:00Z',
      workspaceReference: 'codex/issue-18',
    });
    // act
    test.setSignals([{ ...signal('comment-ci'), action: 'rerun-ci' }]);

    // assert
    await expect(test.service.synchronize()).resolves.toMatchObject({ completed: 1 });

    expect(rerun).toHaveBeenCalledWith('ci:44');
    expect(test.repository.listAutomationReceipts()[0]).toMatchObject({
      signalId: 'comment-ci',
      state: 'completed',
    });
  });

  it('starts at most the configured number of oldest approved analyses', async () => {
    // arrange
    const items = Array.from({ length: 4 }, (_, index): IWorkItem => ({
      ...workItem,
      id: `qualified-${index + 1}`,
      externalId: `#${index + 1}`,
      stageId: 'qualified',
      createdAt: `2026-08-0${index + 1}T10:00:00Z`,
    }));
    // act
    const test = autonomyFixture(items, 3);

    // assert
    await expect(test.service.runAutonomousCycle()).resolves.toMatchObject({
      observed: 4,
      capacity: 0,
      startedAnalyses: 3,
      startedSolutions: 0,
    });

    expect(test.startForWorkItem.mock.calls.map(([item]) => item.id)).toEqual([
      'qualified-1',
      'qualified-2',
      'qualified-3',
    ]);
    expect(test.startForWorkItem).toHaveBeenCalledWith(expect.anything(), undefined, {
      origin: 'autonomy',
    });
  });

  it('serves the queue before it starts anything the board offers', async () => {
    // arrange
    const items = Array.from({ length: 4 }, (_, index): IWorkItem => ({
      ...workItem,
      id: `qualified-${index + 1}`,
      externalId: `#${index + 1}`,
      stageId: 'qualified',
      createdAt: `2026-08-0${index + 1}T10:00:00Z`,
    }));
    let pending = 2;
    // Stands in for the analyzer's own drain: two waiting steps take two of the three slots.
    const drain = vi.fn(async () => {
      for (const suffix of ['a', 'b']) {
        test.repository.saveExecution(
          execution(`queued-${suffix}`, `waiting-${suffix}`, 'analysis', 'running'),
        );
      }
      pending = 0;
      return 2;
    });
    // act
    const test = autonomyFixture(items, 3, undefined, { pending: () => pending, drain });

    // assert
    await expect(test.service.runAutonomousCycle()).resolves.toMatchObject({
      queueStarted: 2,
      queuePending: 0,
      startedAnalyses: 1,
    });

    expect(drain).toHaveBeenCalledTimes(1);
    // Only the slot the queue left over is autonomy's, and it goes to the oldest item.
    expect(test.startForWorkItem.mock.calls.map(([item]) => item.id)).toEqual(['qualified-1']);
  });

  it('leaves autonomy blocked while the queue holds every slot', async () => {
    // arrange
    const items = [{ ...workItem, id: 'qualified-1', externalId: '#1', stageId: 'qualified' }];
    // act
    const test = autonomyFixture(items, 2, undefined, {
      pending: () => 1,
      drain: async () => {
        for (const suffix of ['a', 'b']) {
          test.repository.saveExecution(
            execution(`queued-${suffix}`, `waiting-${suffix}`, 'analysis', 'running'),
          );
        }
        return 2;
      },
    });

    // assert
    await expect(test.service.runAutonomousCycle()).resolves.toMatchObject({
      queueStarted: 2,
      queuePending: 1,
      capacity: 0,
      startedAnalyses: 0,
    });
    expect(test.startForWorkItem).not.toHaveBeenCalled();
  });

  it('treats Assistant phase as an action and not as an execution status', async () => {
    // arrange
    const items: IWorkItem[] = [
      {
        ...workItem,
        id: 'requested-analysis',
        externalId: '#1',
        stageId: 'qualified',
        assistanceAction: 'analyze',
      },
      {
        ...workItem,
        id: 'foreign-solution',
        externalId: '#2',
        stageId: 'qualified',
        assistanceAction: 'solve',
      },
      {
        ...workItem,
        id: 'creator-action',
        externalId: '#3',
        stageId: 'backlog',
        assistanceAction: 'create',
      },
    ];
    // act
    const test = autonomyFixture(items, 3);

    // assert
    await expect(test.service.runAutonomousCycle()).resolves.toMatchObject({
      observed: 3,
      excluded: 0,
      startedAnalyses: 1,
      startedSolutions: 0,
    });

    expect(test.startForWorkItem.mock.calls.map(([item]) => item.id)).toEqual([
      'requested-analysis',
    ]);
    expect(test.startSolutionForWorkItem).not.toHaveBeenCalled();
  });

  it('fairly schedules failed re-analysis, analyzed ready work, and approved analysis', async () => {
    // arrange
    const items: IWorkItem[] = [
      { ...workItem, id: 'failed-analysis', externalId: '#1', stageId: 'qualified' },
      { ...workItem, id: 'failed-solution', externalId: '#2', stageId: 'progress' },
      { ...workItem, id: 'analyzed-ready', externalId: '#3', stageId: 'ready' },
      { ...workItem, id: 'new-approved', externalId: '#4', stageId: 'qualified' },
      { ...workItem, id: 'blocked-failure', externalId: '#5', stageId: 'backlog' },
    ];
    const test = autonomyFixture(items, 3);
    test.repository.saveExecution(
      execution('failed-analysis-run', 'failed-analysis', 'analysis', 'failed'),
    );
    test.repository.saveExecution(
      execution('failed-solution-run', 'failed-solution', 'solution', 'failed'),
    );
    test.repository.saveExecution({
      ...execution('ready-analysis', 'analyzed-ready', 'analysis', 'succeeded'),
      summary: 'Approved plan.',
    });
    // act
    test.repository.saveExecution(
      execution('blocked-failure-run', 'blocked-failure', 'solution', 'failed'),
    );

    // assert
    await expect(test.service.runAutonomousCycle()).resolves.toMatchObject({
      retried: 1,
      startedAnalyses: 2,
      startedSolutions: 1,
      capacity: 0,
    });

    expect(test.startForWorkItem).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'failed-analysis' }),
      'Re-analyze the work item after the failed analysis.',
      { origin: 'autonomy' },
    );
    expect(test.startForWorkItem.mock.calls.map(([item]) => item.id)).toEqual([
      'failed-analysis',
      'new-approved',
    ]);
    expect(test.startSolutionForWorkItem.mock.calls.map(([item]) => item.id)).toEqual([
      'analyzed-ready',
    ]);
    expect(test.transitions).not.toContainEqual(['failed-solution', 'ready']);
    expect(test.startForWorkItem).not.toHaveBeenCalledWith(
      expect.objectContaining({ id: 'failed-solution' }),
      expect.anything(),
      expect.anything(),
    );
    expect(test.startForWorkItem).not.toHaveBeenCalledWith(
      expect.objectContaining({ id: 'blocked-failure' }),
      expect.anything(),
      expect.anything(),
    );
  });

  it('skips autonomy-excluded work in every autonomous scheduling lane', async () => {
    // arrange
    const items: IWorkItem[] = [
      {
        ...workItem,
        id: 'excluded-failure',
        externalId: '#1',
        stageId: 'qualified',
        labels: ['Autonomy:Excluded'],
      },
      {
        ...workItem,
        id: 'excluded-ready',
        externalId: '#2',
        stageId: 'qualified',
        labels: ['autonomy:excluded'],
      },
      {
        ...workItem,
        id: 'excluded-approved',
        externalId: '#3',
        stageId: 'qualified',
        labels: [' autonomy:excluded '],
      },
      { ...workItem, id: 'eligible-approved', externalId: '#4', stageId: 'qualified' },
    ];
    const test = autonomyFixture(items, 3);
    test.repository.saveExecution(
      execution('excluded-failure-run', 'excluded-failure', 'analysis', 'failed'),
    );
    // act
    test.repository.saveExecution({
      ...execution('excluded-ready-analysis', 'excluded-ready', 'analysis', 'succeeded'),
      summary: 'Approved plan.',
    });

    // assert
    await expect(test.service.runAutonomousCycle()).resolves.toMatchObject({
      observed: 4,
      excluded: 3,
      capacity: 2,
      retried: 0,
      startedAnalyses: 1,
      startedSolutions: 0,
    });

    expect(test.startForWorkItem.mock.calls.map(([item]) => item.id)).toEqual([
      'eligible-approved',
    ]);
    expect(test.startSolutionForWorkItem).not.toHaveBeenCalled();
    expect(test.transitions).toEqual([]);
  });

  it('synchronizes delivered pull requests even when their work is autonomy-excluded', async () => {
    // arrange
    const items: IWorkItem[] = [
      {
        ...workItem,
        id: 'open-pr',
        externalId: '#1',
        stageId: 'progress',
        labels: ['autonomy:excluded'],
      },
      {
        ...workItem,
        id: 'merged-pr',
        externalId: '#2',
        stageId: 'progress',
        labels: ['autonomy:excluded'],
      },
    ];
    const test = autonomyFixture(
      items,
      3,
      new Map([
        [1, 'open'],
        [2, 'merged'],
      ]),
    );
    test.repository.saveExecution({
      ...execution('solution-open', 'open-pr', 'solution', 'succeeded'),
      pullRequest: {
        number: 1,
        externalUrl: 'https://github.com/example/platform/pull/1',
        branchUrl: 'https://github.com/example/platform/tree/codex/issue-1',
      },
    });
    // act
    test.repository.saveExecution({
      ...execution('solution-merged', 'merged-pr', 'solution', 'succeeded'),
      pullRequest: {
        number: 2,
        externalUrl: 'https://github.com/example/platform/pull/2',
        branchUrl: 'https://github.com/example/platform/tree/codex/issue-2',
      },
    });

    // Both a delivered and a merged pull request move the work to acceptance: merging does
    // not finish a work item, the human gate after it does.
    // assert
    await expect(test.service.runAutonomousCycle()).resolves.toMatchObject({
      excluded: 2,
      reviewed: 2,
      completed: 0,
    });

    expect(test.transitions).toEqual([
      ['open-pr', 'acceptance'],
      ['merged-pr', 'acceptance'],
    ]);
  });

  it('freezes a merged delivery group as completed historical evidence', async () => {
    // arrange
    const items: IWorkItem[] = [
      { ...workItem, id: 'group-root', externalId: '#1', stageId: 'progress', revision: 1 },
      { ...workItem, id: 'group-member', externalId: '#2', stageId: 'progress', revision: 2 },
    ];
    const test = autonomyFixture(items, 3, new Map([[3, 'merged']]));
    test.repository.saveDeliveryGroup({
      id: 'delivery-group-1',
      workspaceId: 'personal',
      deliveryContextId: 'project',
      repository: 'example/platform',
      rootWorkItemId: 'group-root',
      workItemIds: ['group-root', 'group-member'],
      revisions: { 'group-root': 1, 'group-member': 2 },
      stageId: 'progress',
      state: 'active',
      activationSource: 'proposal-confirmed',
      createdAt: '2026-08-11T09:00:00Z',
      updatedAt: '2026-08-11T09:00:00Z',
    });
    test.repository.saveExecution({
      ...execution('solution-group', 'group-root', 'solution', 'succeeded'),
      deliveryGroupId: 'delivery-group-1',
      workItemIds: ['group-root', 'group-member'],
      workItemRevisions: { 'group-root': 1, 'group-member': 2 },
      pullRequest: {
        number: 3,
        externalUrl: 'https://github.com/example/platform/pull/3',
        branchUrl: 'https://github.com/example/platform/tree/codex/issue-1',
      },
    });

    // act
    await test.service.runAutonomousCycle();

    // assert
    expect(test.repository.listDeliveryGroups()).toMatchObject([
      {
        id: 'delivery-group-1',
        state: 'completed',
        completedAt: '2026-08-11T10:02:00Z',
      },
    ]);
    expect(test.synchronizedGroupStates).toEqual(['completed']);
  });

  it('leaves work items alone whose workflow record parks them', async () => {
    // arrange
    const items: IWorkItem[] = [
      { ...workItem, id: 'waiting-retry', externalId: '#1', stageId: 'qualified' },
      { ...workItem, id: 'awaiting-person', externalId: '#2', stageId: 'qualified' },
      { ...workItem, id: 'eligible', externalId: '#3', stageId: 'qualified' },
    ];
    const test = autonomyFixture(items, 3);
    const template: IWorkflowRecord = {
      workItemId: 'waiting-retry',
      workspaceId: 'personal',
      sourceId: 'project',
      workflowId: defaultWorkflow.id,
      workflowVersion: defaultWorkflow.version,
      stageId: 'qualified',
      runtimeState: 'retry-wait',
      revisions: {},
      routing: { nextRetryAt: '2026-08-11T11:00:00Z' },
      counters: {
        retriesByReason: {},
        reworksByRoute: {},
        consecutiveIdenticalFailures: 0,
        totalRuns: 1,
        enteredAt: '2026-08-11T10:00:00Z',
      },
      artifacts: [],
      pullRequestIds: [],
      updatedAt: '2026-08-11T10:00:00Z',
    };
    test.workflowRecords.set('waiting-retry', template);
    // act
    test.workflowRecords.set('awaiting-person', {
      ...template,
      workItemId: 'awaiting-person',
      runtimeState: 'human-required',
    });

    // assert
    await expect(test.service.runAutonomousCycle()).resolves.toMatchObject({
      observed: 3,
      excluded: 2,
      startedAnalyses: 1,
    });
    expect(test.startForWorkItem.mock.calls.map(([item]) => item.id)).toEqual(['eligible']);
  });

  it('routes a pull request closed without merging back to re-analysis through the supervisor', async () => {
    // arrange
    const items: IWorkItem[] = [
      { ...workItem, id: 'closed-pr', externalId: '#1', stageId: 'progress' },
    ];
    const test = autonomyFixture(items, 3, new Map([[1, 'closed']]));
    test.repository.saveExecution({
      ...execution('solution-closed', 'closed-pr', 'solution', 'succeeded'),
      pullRequest: {
        number: 1,
        externalUrl: 'https://github.com/example/platform/pull/1',
        branchUrl: 'https://github.com/example/platform/tree/codex/issue-1',
      },
    });

    // act
    await test.service.runAutonomousCycle();

    // The implementation is gone, so the verification outcome is rework routed to the stage
    // that owns re-analysis - applied by the supervisor, not by the synchronization itself.
    // assert
    expect(test.transitions).toEqual([['closed-pr', 'qualified']]);
  });

  it('defers a solution whose predicted surface overlaps an in-flight delivery', async () => {
    // arrange
    const items: IWorkItem[] = [
      { ...workItem, id: 'in-flight', externalId: '#1', stageId: 'progress' },
      { ...workItem, id: 'overlapping', externalId: '#2', stageId: 'ready' },
    ];
    const test = autonomyFixture(items, 2, undefined, undefined, () => ({
      ...defaultAgenticDeliveryPolicy,
      conflictSerializationEnabled: true,
    }));
    test.repository.saveExecution({
      ...execution('solution-in-flight', 'in-flight', 'solution', 'succeeded'),
      pullRequest: {
        number: 7,
        externalUrl: 'https://github.com/example/platform/pull/7',
        branchUrl: 'https://github.com/example/platform/tree/codex/issue-1',
      },
    });
    test.repository.saveGoal(
      measuredSurfaceGoal('in-flight', 'solution-in-flight', ['libs/shared/util.ts']),
    );
    test.repository.saveExecution({
      ...execution('analysis-overlapping', 'overlapping', 'analysis', 'succeeded'),
      summary: 'Approved plan.',
    });
    test.workflowRecords.set(
      'overlapping',
      readyWorkflowRecord('overlapping', ['libs/shared/util.ts']),
    );

    // act
    const result = await test.service.runAutonomousCycle();

    // The deferral spends no capacity: the free slot stays available instead of being burned
    // on a delivery that would collide with the pull request still in flight.
    // assert
    expect(result).toMatchObject({
      deferred: 1,
      startedSolutions: 0,
      startedAnalyses: 0,
      failed: 0,
      capacity: 2,
    });
    expect(result.failureSamples).toEqual([
      {
        workItemId: 'overlapping',
        externalId: '#2',
        message:
          'Deferred: the predicted change surface overlaps in-flight pull request #7 for work item in-flight.',
      },
    ]);
    expect(test.startSolutionForWorkItem).not.toHaveBeenCalled();
  });

  it('starts an overlapping solution normally while conflict serialization is disabled', async () => {
    // arrange
    const items: IWorkItem[] = [
      { ...workItem, id: 'in-flight', externalId: '#1', stageId: 'progress' },
      { ...workItem, id: 'overlapping', externalId: '#2', stageId: 'ready' },
    ];
    const test = autonomyFixture(items, 2, undefined, undefined, () => ({
      ...defaultAgenticDeliveryPolicy,
      conflictSerializationEnabled: false,
    }));
    test.repository.saveExecution({
      ...execution('solution-in-flight', 'in-flight', 'solution', 'succeeded'),
      pullRequest: {
        number: 7,
        externalUrl: 'https://github.com/example/platform/pull/7',
        branchUrl: 'https://github.com/example/platform/tree/codex/issue-1',
      },
    });
    test.repository.saveGoal(
      measuredSurfaceGoal('in-flight', 'solution-in-flight', ['libs/shared/util.ts']),
    );
    test.repository.saveExecution({
      ...execution('analysis-overlapping', 'overlapping', 'analysis', 'succeeded'),
      summary: 'Approved plan.',
    });
    test.workflowRecords.set(
      'overlapping',
      readyWorkflowRecord('overlapping', ['libs/shared/util.ts']),
    );

    // act
    const result = await test.service.runAutonomousCycle();

    // assert
    expect(result).toMatchObject({ deferred: 0, startedSolutions: 1, capacity: 1 });
    expect(test.startSolutionForWorkItem).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'overlapping' }),
      undefined,
      { origin: 'autonomy' },
    );
  });

  it('routes a grouped member through the verification of the root pull request', async () => {
    // arrange
    const items: IWorkItem[] = [
      { ...workItem, id: 'group-root', externalId: '#1', stageId: 'progress' },
      { ...workItem, id: 'group-member', externalId: '#2', stageId: 'progress' },
    ];
    const test = autonomyFixture(items, 3, new Map([[3, 'merged']]));
    test.repository.saveDeliveryGroup({
      id: 'delivery-group-1',
      workspaceId: 'personal',
      deliveryContextId: 'project',
      repository: 'example/platform',
      rootWorkItemId: 'group-root',
      workItemIds: ['group-root', 'group-member'],
      revisions: {},
      stageId: 'progress',
      state: 'active',
      activationSource: 'manual-select',
      createdAt: '2026-08-11T09:00:00Z',
      updatedAt: '2026-08-11T09:00:00Z',
    });
    test.repository.saveExecution({
      ...execution('solution-group', 'group-root', 'solution', 'succeeded'),
      deliveryGroupId: 'delivery-group-1',
      workItemIds: ['group-root', 'group-member'],
      pullRequest: {
        number: 3,
        externalUrl: 'https://github.com/example/platform/pull/3',
        branchUrl: 'https://github.com/example/platform/tree/codex/issue-1',
      },
    });

    // act
    const result = await test.service.runAutonomousCycle();

    // The member carries no execution of its own, so it rides the root's inspected pull
    // request into the same verification - observed once, and the root reported only once.
    // assert
    expect(test.transitions).toEqual([
      ['group-root', 'acceptance'],
      ['group-member', 'acceptance'],
    ]);
    expect(test.inspectPullRequest).toHaveBeenCalledTimes(1);
    expect(result).toMatchObject({ reviewed: 2, completed: 0, failed: 0 });
  });
});

describe('agentic delivery automation', () => {
  it('updates a behind managed pull-request branch without requiring board autonomy', async () => {
    // arrange
    const test = agenticFixture('error: ENOSPC: no space left on device, write', 'behind');

    // act
    const result = await test.service.runAutonomousCycle();

    // assert
    expect(result.agenticBranchUpdates).toBe(1);
    expect(test.updatePullRequestBranch).toHaveBeenCalledWith(
      expect.objectContaining({ workspaceReference: 'codex/repair-formatting' }),
      workItem,
      'abc123',
    );
  });

  it('starts a managed revision when the base branch conflicts with the pull-request head', async () => {
    // arrange
    const test = agenticFixture('error: ENOSPC: no space left on device, write', 'conflicting');

    // act
    const result = await test.service.runAutonomousCycle();

    // assert
    expect(result.agenticRepairs).toBe(1);
    expect(test.startRepair).toHaveBeenCalledWith(
      workItem,
      expect.objectContaining({ workspaceReference: 'codex/repair-formatting' }),
      expect.objectContaining({
        state: 'succeeded',
        summary: expect.stringContaining('conflicts with its current base branch'),
      }),
      expect.objectContaining({ classification: 'source', state: 'repairing' }),
      expect.objectContaining({ failureLog: expect.stringContaining('without rebasing') }),
      expect.objectContaining({ managedBranchUpdatesEnabled: true }),
    );
    expect(test.updatePullRequestBranch).not.toHaveBeenCalled();
  });

  it('leaves a conflicting draft pull request without a managed revision', async () => {
    // arrange
    const test = agenticFixture(undefined, 'conflicting', { draft: true });

    // act
    const result = await test.service.runAutonomousCycle();

    // A draft conflict is the author's concern: no repair budget is spent on work in progress.
    // assert
    expect(result.agenticRepairs).toBe(0);
    expect(result.failed).toBe(0);
    expect(test.startRepair).not.toHaveBeenCalled();
    expect(test.updatePullRequestBranch).not.toHaveBeenCalled();
  });

  it('baselines existing failures and reruns a later ENOSPC failure without source repair', async () => {
    // arrange
    const test = agenticFixture();
    await test.service.runAutonomousCycle();
    // act
    test.setRun({ ...test.run(), id: 'run-2', runAttempt: 1 });

    // assert
    await expect(test.service.runAutonomousCycle()).resolves.toMatchObject({
      agenticObserved: 2,
      agenticReruns: 1,
      agenticDiagnoses: 0,
      agenticRepairs: 0,
    });

    expect(test.rerun).toHaveBeenCalledWith('run-2');
    expect(test.startDiagnosis).not.toHaveBeenCalled();
    expect(test.repository.listAgenticDeliveries().at(-1)).toMatchObject({
      classification: 'infrastructure',
      state: 'awaiting-ci',
    });
    await test.service.runAutonomousCycle();
    expect(test.rerun).toHaveBeenCalledTimes(1);
  });

  it('recovers a completed source diagnosis and starts one managed-branch repair', async () => {
    // arrange
    const test = agenticFixture('Tests failed: expected 2 to equal 3');
    await test.service.runAutonomousCycle();
    test.setRun({ ...test.run(), id: 'run-source', runAttempt: 1 });
    await test.service.runAutonomousCycle();
    const diagnosis = test.repository
      .listExecutions()
      .find((execution) => execution.skillFlowRole === 'ci-diagnosis')!;
    // act
    test.repository.saveExecution({
      ...diagnosis,
      state: 'succeeded',
      summary: 'The assertion in formatter.spec.ts is stale.',
      finishedAt: '2026-08-11T10:03:00Z',
    });

    // assert
    await expect(test.service.runAutonomousCycle()).resolves.toMatchObject({
      agenticRepairs: 1,
    });
    expect(test.startRepair).toHaveBeenCalledTimes(1);
    expect(test.repository.listAgenticDeliveries().at(-1)).toMatchObject({
      classification: 'source',
      state: 'repairing',
    });
  });

  it('leaves a draft pull request behind its base untouched', async () => {
    // arrange
    const test = agenticFixture(undefined, 'behind', { draft: true });

    // act
    const result = await test.service.runAutonomousCycle();

    // A draft is still being worked on: it is observed, but never advanced for its author.
    // assert
    expect(test.inspectPullRequest).toHaveBeenCalledTimes(1);
    expect(test.updatePullRequestBranch).not.toHaveBeenCalled();
    expect(result.agenticBranchUpdates).toBe(0);
    expect(result.failed).toBe(0);
    expect(result.failureSamples).toEqual([]);
  });

  it('inspects a pull request shared by two grouped work items exactly once per cycle', async () => {
    // arrange
    const memberItem: IWorkItem = { ...workItem, id: 'project-item-2', externalId: '#19' };
    const test = agenticFixture(undefined, 'behind', { items: [workItem, memberItem] });
    test.repository.saveExecution({
      ...execution('member-solution', memberItem.id, 'solution', 'succeeded'),
      workspacePath: '/managed/worktree',
      workspaceReference: 'codex/repair-formatting',
      pullRequest: {
        number: 42,
        externalUrl: 'https://github.com/example/platform/pull/42',
        branchUrl: 'https://github.com/example/platform/tree/codex/repair-formatting',
      },
    });

    // act
    const result = await test.service.runAutonomousCycle();

    // assert
    expect(test.inspectPullRequest).toHaveBeenCalledTimes(1);
    expect(test.updatePullRequestBranch).toHaveBeenCalledTimes(1);
    expect(test.updatePullRequestBranch).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'source-solution' }),
      workItem,
      'abc123',
    );
    expect(result.agenticBranchUpdates).toBe(1);
  });

  it('surfaces five consecutive unknown mergeability observations without counting a failure', async () => {
    // arrange
    const test = agenticFixture(undefined, 'unknown');
    const preceding: IAutonomousCycleResult[] = [];
    for (let cycle = 0; cycle < 4; cycle += 1) {
      preceding.push(await test.service.runAutonomousCycle());
    }

    // act
    const fifth = await test.service.runAutonomousCycle();

    // assert
    expect(preceding.flatMap((result) => result.failureSamples)).toEqual([]);
    expect(fifth.failureSamples).toEqual([
      {
        workItemId: 'project-item-1',
        externalId: '#18',
        message:
          'GitHub has not reported mergeability for pull request #42 across 5 consecutive inspections.',
      },
    ]);
    expect(fifth.failed).toBe(0);
    expect(test.updatePullRequestBranch).not.toHaveBeenCalled();
  });

  it('resets the unknown mergeability streak after one definitive observation', async () => {
    // arrange
    const test = agenticFixture(undefined, 'unknown');
    for (let cycle = 0; cycle < 5; cycle += 1) {
      await test.service.runAutonomousCycle();
    }
    test.setBaseBranchStatus('current');
    await test.service.runAutonomousCycle();
    test.setBaseBranchStatus('unknown');

    // act
    const result = await test.service.runAutonomousCycle();

    // Without the reset this would be the seventh consecutive unknown and sample again.
    // assert
    expect(result.failureSamples).toEqual([]);
    expect(result.failed).toBe(0);
  });

  it('bounds managed-branch inspections to the twenty oldest deliveries per cycle', async () => {
    // arrange
    const items = Array.from({ length: 25 }, (_, index): IWorkItem => ({
      ...workItem,
      id: `cap-${index + 1}`,
      externalId: `#${index + 1}`,
    }));
    const test = agenticFixture(undefined, 'current', { items });
    for (const [index, item] of items.entries()) {
      test.repository.saveExecution({
        ...execution(`cap-solution-${index + 1}`, item.id, 'solution', 'succeeded'),
        startedAt: `2026-08-01T00:${String(index + 1).padStart(2, '0')}:00Z`,
        workspacePath: '/managed/worktree',
        workspaceReference: `codex/cap-${index + 1}`,
        pullRequest: {
          number: index + 1,
          externalUrl: `https://github.com/example/platform/pull/${index + 1}`,
          branchUrl: `https://github.com/example/platform/tree/codex/cap-${index + 1}`,
        },
      });
    }

    // act
    await test.service.runAutonomousCycle();

    // assert
    expect(test.inspectPullRequest).toHaveBeenCalledTimes(20);
    expect(
      test.inspectPullRequest.mock.calls.map(([record]) => record.pullRequest!.number),
    ).toEqual(Array.from({ length: 20 }, (_, index) => index + 1));
  });

  it('treats a stale expected head rejection as benign and re-inspects next cycle', async () => {
    // arrange
    const test = agenticFixture(undefined, 'behind');
    test.updatePullRequestBranch.mockRejectedValue(
      new Error('Update failed: HTTP 422: expected head sha is no longer current'),
    );
    const first = await test.service.runAutonomousCycle();

    // act
    const second = await test.service.runAutonomousCycle();

    // The head moved between inspection and update; the next cycle re-observes instead of
    // recording a failure for a race GitHub resolves on its own.
    // assert
    expect(first.failed).toBe(0);
    expect(second.failed).toBe(0);
    expect(second.failureSamples).toEqual([]);
    expect(second.agenticBranchUpdates).toBe(0);
    expect(test.inspectPullRequest).toHaveBeenCalledTimes(2);
    expect(test.updatePullRequestBranch).toHaveBeenCalledTimes(2);
  });

  it('reflects the last observed base qualification of every managed pull request', async () => {
    // arrange
    const test = agenticFixture(undefined, 'behind');

    // act
    await test.service.runAutonomousCycle();

    // assert
    expect(test.service.listPullRequestQualifications()).toEqual([
      {
        workspaceId: 'personal',
        pullRequestNumber: 42,
        workItemId: 'project-item-1',
        baseBranchStatus: 'behind',
        observedAt: '2026-08-11T10:04:00Z',
      },
    ]);
    await test.service.runAutonomousCycle();
    expect(test.service.listPullRequestQualifications()).toEqual([
      expect.objectContaining({ pullRequestNumber: 42, baseBranchStatus: 'current' }),
    ]);
  });
});

function execution(
  id: string,
  workItemId: string,
  kind: 'analysis' | 'solution',
  state: IExecutionRecord['state'],
): IExecutionRecord {
  return {
    id,
    workspaceId: 'personal',
    workItemId,
    workflowId: 'default',
    kind,
    state,
    startedAt: '2026-08-11T09:00:00Z',
  };
}

function analysisArtifact(likelyChangeSurface: readonly string[]): IAnalysisArtifact {
  return {
    feasible: true,
    issueRevision: '1',
    problemUnderstanding: 'Understood.',
    affectedComponents: [],
    likelyChangeSurface,
    dependencies: [],
    implementationPlan: [{ step: 1, description: 'Apply the approved plan.' }],
    databaseMigrationRequired: false,
    risk: { class: 'low', reasons: [] },
    testStrategy: ['Unit tests cover the change.'],
    acceptanceMapping: [],
    unresolvedQuestions: [],
    collisionRisk: 'low',
    readyForSolve: true,
  };
}

function readyWorkflowRecord(
  workItemId: string,
  likelyChangeSurface: readonly string[],
): IWorkflowRecord {
  return {
    workItemId,
    workspaceId: 'personal',
    sourceId: 'project',
    workflowId: defaultWorkflow.id,
    workflowVersion: defaultWorkflow.version,
    stageId: 'ready',
    runtimeState: 'idle',
    revisions: {},
    routing: {},
    counters: {
      retriesByReason: {},
      reworksByRoute: {},
      consecutiveIdenticalFailures: 0,
      totalRuns: 1,
      enteredAt: '2026-08-11T10:00:00Z',
    },
    artifacts: [],
    analysis: analysisArtifact(likelyChangeSurface),
    pullRequestIds: [],
    updatedAt: '2026-08-11T10:00:00Z',
  };
}

function measuredSurfaceGoal(
  workItemId: string,
  executionId: string,
  changedFiles: readonly string[],
): IGoalRecord {
  return {
    id: `goal-${workItemId}`,
    workspaceId: 'personal',
    workItemId,
    assignment: {
      id: `goal-${workItemId}-assignment`,
      workspaceId: 'personal',
      workItemId,
      agentTeamId: 'team',
      responsibleAgentId: 'agent',
      objective: `Deliver ${workItemId}`,
      assignedAt: '2026-08-11T09:00:00Z',
      updatedAt: '2026-08-11T09:00:00Z',
    },
    state: 'planning',
    currentRole: 'analysis',
    handoffs: [],
    verificationReports: [
      {
        id: `verification-${executionId}`,
        executionId,
        recordedAt: '2026-08-11T09:30:00Z',
        state: 'passed',
        changedFiles,
        diffLines: 12,
        checks: [],
      },
    ],
    reviewDecisions: [],
    createdAt: '2026-08-11T09:00:00Z',
    updatedAt: '2026-08-11T09:30:00Z',
  };
}

function agenticFixture(
  failureLog = 'error: ENOSPC: no space left on device, write',
  initialBaseBranchStatus: PullRequestBaseBranchStatus = 'current',
  options: { readonly draft?: boolean; readonly items?: readonly IWorkItem[] } = {},
) {
  const items = options.items ?? [workItem];
  const repository = createMemoryExecutionRepository();
  repository.saveExecution({
    ...execution('source-solution', workItem.id, 'solution', 'succeeded'),
    workspacePath: '/managed/worktree',
    workspaceReference: 'codex/repair-formatting',
    pullRequest: {
      number: 42,
      externalUrl: 'https://github.com/example/platform/pull/42',
      branchUrl: 'https://github.com/example/platform/tree/codex/repair-formatting',
    },
  });
  let currentRun: ICiRun = {
    id: 'run-baseline',
    workspaceId: 'personal',
    ciBindingId: 'ci-repository',
    repositoryBindingId: 'repository',
    name: 'CI',
    status: 'failed',
    branch: 'codex/repair-formatting',
    revision: 'abc123',
    runAttempt: 1,
    finishedAt: '2026-08-11T10:01:00Z',
  };
  const runs: ICiRun[] = [currentRun];
  let sequence = 0;
  const rerun = vi.fn(async () => undefined);
  let baseBranchStatus: PullRequestBaseBranchStatus = initialBaseBranchStatus;
  const updatePullRequestBranch = vi.fn(async () => {
    baseBranchStatus = 'current';
  });
  const inspectPullRequest = vi.fn(
    async (record: IExecutionRecord): Promise<IPullRequestStatus> => ({
      state: 'open',
      draft: options.draft ?? false,
      headCommitSha: 'abc123',
      baseBranchStatus,
      sourceBranch: record.workspaceReference,
      targetBranch: 'main',
    }),
  );
  const startDiagnosis = vi.fn(async () => {
    const record: IExecutionRecord = {
      ...execution(`diagnosis-${++sequence}`, workItem.id, 'analysis', 'running'),
      skillFlowRole: 'ci-diagnosis',
      automationOrigin: 'agentic-delivery',
    };
    repository.saveExecution(record);
    return record;
  });
  const startRepair = vi.fn(async () => {
    const record: IExecutionRecord = {
      ...execution(`repair-${++sequence}`, workItem.id, 'solution', 'running'),
      kind: 'revision',
      skillFlowRole: 'ci-repair',
      automationOrigin: 'agentic-delivery',
    };
    repository.saveExecution(record);
    return record;
  });
  const service = new AutomationService({
    workflow: () => defaultWorkflow,
    tracker: {
      listWorkItems: async () => items,
    },
    listWorkItems: async () => items,
    executions: {
      startForWorkItem: async () => {
        throw new Error('Unexpected analysis.');
      },
      startSolutionForWorkItem: async () => {
        throw new Error('Unexpected solution.');
      },
      startAgenticDeliveryDiagnosis: startDiagnosis,
      startAgenticDeliveryRepair: startRepair,
    },
    repository,
    executionRepository: repository,
    clock: { now: () => '2026-08-11T10:04:00Z' },
    enabled: () => false,
    autonomyEnabled: () => false,
    agenticDeliveryPolicy: () => ({
      ...defaultAgenticDeliveryPolicy,
      enabled: true,
      observeFailures: true,
      aiDiagnosisEnabled: true,
      sourceRepairEnabled: true,
      managedBranchUpdatesEnabled: true,
      ciRerunEnabled: true,
    }),
    agenticDeliveryEnabledFor: () => true,
    ci: {
      listRuns: async () => runs,
      getRunDetails: async (runId) => ({
        runId,
        jobs: [
          {
            id: 'job',
            name: failureLog.includes('ENOSPC') ? 'Install' : 'Tests',
            status: 'failed',
            steps: [{ id: 'step', name: 'Run tests', status: 'failed' }],
          },
        ],
        failureLog,
      }),
      rerun,
    },
    delivery: {
      inspectPullRequest,
      updatePullRequestBranch,
    },
  });
  return {
    service,
    repository,
    rerun,
    startDiagnosis,
    startRepair,
    inspectPullRequest,
    updatePullRequestBranch,
    run: () => currentRun,
    setRun: (run: ICiRun) => {
      currentRun = run;
      runs.push(run);
    },
    setBaseBranchStatus: (value: PullRequestBaseBranchStatus) => {
      baseBranchStatus = value;
    },
  };
}

function autonomyFixture(
  initialItems: readonly IWorkItem[],
  maxParallelExecutions: number,
  pullRequestStates = new Map<number, 'open' | 'closed' | 'merged'>(),
  executionQueue?: { readonly pending: () => number; readonly drain: () => Promise<number> },
  agenticDeliveryPolicy?: () => IAgenticDeliveryPolicy,
) {
  const repository = createMemoryExecutionRepository();
  let items = [...initialItems];
  let sequence = 0;
  const transitions: Array<[string, IWorkItem['stageId']]> = [];
  const synchronizedGroupStates: string[] = [];
  const workflowRecords = new Map<string, IWorkflowRecord>();
  const startForWorkItem = vi.fn(
    async (item: IWorkItem, request?: string, trigger?: IAutomationExecutionTrigger) => {
      const record: IExecutionRecord = {
        ...execution(`analysis-${++sequence}`, item.id, 'analysis', 'running'),
        request,
        automationOrigin: trigger?.origin,
      };
      repository.saveExecution(record);
      return record;
    },
  );
  const startSolutionForWorkItem = vi.fn(
    async (item: IWorkItem, request?: string, trigger?: IAutomationExecutionTrigger) => {
      const record: IExecutionRecord = {
        ...execution(`solution-${++sequence}`, item.id, 'solution', 'running'),
        request,
        automationOrigin: trigger?.origin,
      };
      repository.saveExecution(record);
      return record;
    },
  );
  const tracker = {
    listWorkItems: async () => items,
    transition: async (workItemId: string, stageId: IWorkItem['stageId'] & string) => {
      transitions.push([workItemId, stageId]);
      const updated = { ...items.find((item) => item.id === workItemId)!, stageId };
      items = items.map((item) => (item.id === workItemId ? updated : item));
      return updated;
    },
    synchronizeDeliveryGroup: async (group: { readonly state: string }) => {
      synchronizedGroupStates.push(group.state);
    },
  };
  // The real supervisor routes the reported verification outcomes, so these tests cover the
  // whole chain from pull-request fact to guarded board transition.
  const workflowEngine = new WorkflowEngineService({
    workflow: () => defaultWorkflow,
    records: {
      workflowRecord: (id) => workflowRecords.get(id),
      listWorkflowRecords: () => [...workflowRecords.values()],
      saveWorkflowRecord: (record) => void workflowRecords.set(record.workItemId, record),
      saveWorkflowAudit: () => undefined,
      listWorkflowAudit: () => [],
      nextWorkflowAuditSequence: () => 1,
    },
    tracker,
    clock: { now: () => '2026-08-11T10:02:00Z' },
    ids: { next: (prefix) => `${prefix}-${++sequence}` },
    owner: () => 'test-machine',
  });
  const inspectPullRequest = vi.fn(
    async (record: IExecutionRecord): Promise<IPullRequestStatus> => ({
      state: pullRequestStates.get(record.pullRequest!.number) ?? 'open',
      draft: false,
    }),
  );
  const service = new AutomationService({
    workflow: () => defaultWorkflow,
    tracker,
    workflowReporter: {
      applyRunResult: (item, result) => workflowEngine.applyRunResult(item, result),
    },
    workflowRecord: (workItemId) => workflowRecords.get(workItemId),
    executions: { startForWorkItem, startSolutionForWorkItem },
    repository,
    executionRepository: repository,
    clock: { now: () => '2026-08-11T10:02:00Z' },
    enabled: () => false,
    autonomyEnabled: () => true,
    maxParallelExecutions: () => maxParallelExecutions,
    ...(executionQueue ? { executionQueue } : {}),
    ...(agenticDeliveryPolicy ? { agenticDeliveryPolicy } : {}),
    delivery: {
      inspectPullRequest,
    },
  });
  return {
    service,
    repository,
    transitions,
    synchronizedGroupStates,
    workflowRecords,
    inspectPullRequest,
    startForWorkItem,
    startSolutionForWorkItem,
  };
}
