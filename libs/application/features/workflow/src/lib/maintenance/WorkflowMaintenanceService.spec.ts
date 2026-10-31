// #region Imports

import { describe, expect, it, vi } from 'vitest';
import { WorkflowEngineService } from '../engine/WorkflowEngineService';
import { WorkflowMaintenanceService } from './WorkflowMaintenanceService';
import { defaultWorkflow, type IWorkflowRecord } from '@symphony/domain-workflow';
import type { IWorkItem } from '@symphony/domain-work';

// #endregion

function workItem(id: string, stageId: string): IWorkItem {
  return {
    id,
    workspaceId: 'personal',
    sourceId: 'board',
    externalId: `#${id.replace(/\D/gu, '') || '1'}`,
    title: 'Reconcile managed workspaces',
    body: 'Reconcile managed workspaces after restart.',
    stageId,
    provider: 'simulated',
    repository: 'example/platform',
    labels: [],
    assignees: [],
  };
}

function createFixture(items: readonly IWorkItem[], initialNow = '2026-08-19T10:00:00.000Z') {
  const records = new Map<string, IWorkflowRecord>();
  let currentItems = [...items];
  let now = initialNow;
  const engine = new WorkflowEngineService({
    workflow: () => defaultWorkflow,
    records: {
      workflowRecord: (id) => records.get(id),
      listWorkflowRecords: () => [...records.values()],
      saveWorkflowRecord: (record) => void records.set(record.workItemId, record),
      saveWorkflowAudit: () => undefined,
      listWorkflowAudit: () => [],
      nextWorkflowAuditSequence: () => 1,
    },
    tracker: {
      transition: async (id, stageId) => {
        currentItems = currentItems.map((item) => (item.id === id ? { ...item, stageId } : item));
        return currentItems.find((item) => item.id === id)!;
      },
    },
    clock: { now: () => now },
    ids: { next: (prefix) => `${prefix}-1` },
    owner: () => 'test-machine',
    jitter: () => 0.5,
    capacityAvailable: () => true,
  });
  const startForWorkItem = vi.fn(async () => ({}) as never);
  const startSolutionForWorkItem = vi.fn(async () => ({}) as never);
  const maintenance = new WorkflowMaintenanceService({
    engine,
    workflow: () => defaultWorkflow,
    clock: { now: () => now },
    listWorkItems: async () => currentItems,
    executions: { startForWorkItem, startSolutionForWorkItem },
    capacityAvailable: () => true,
  });
  return {
    engine,
    maintenance,
    records,
    startForWorkItem,
    startSolutionForWorkItem,
    setNow: (instant: string) => {
      now = instant;
    },
  };
}

async function holdWithRetry(fixture: ReturnType<typeof createFixture>, item: IWorkItem) {
  await fixture.engine.applyRunResult(item, {
    runId: 'execution-1',
    role: 'analyze',
    outcome: 'retry',
    reasonCode: 'transient-tool-error',
    summary: 'Provider timeout.',
    evidence: [],
    finishedAt: '2026-08-19T10:00:00.000Z',
  });
}

describe('WorkflowMaintenanceService', () => {
  it('restarts a held role once its scheduled retry falls due, not earlier', async () => {
    // arrange
    const item = workItem('work-1', 'qualified');
    const fixture = createFixture([item]);
    // act
    await holdWithRetry(fixture, item);

    // Before the scheduled time the item stays parked; autonomy must not touch it either.
    // assert
    await expect(fixture.maintenance.runOnce()).resolves.toMatchObject({
      held: 1,
      resumedRetries: 0,
    });
    expect(fixture.startForWorkItem).not.toHaveBeenCalled();
    expect(fixture.records.get('work-1')?.runtimeState).toBe('retry-wait');

    fixture.setNow('2026-08-19T10:10:00.000Z');
    await expect(fixture.maintenance.runOnce()).resolves.toMatchObject({
      held: 1,
      resumedRetries: 1,
    });
    expect(fixture.startForWorkItem).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'work-1' }),
      undefined,
      { origin: 'workflow' },
    );
    expect(fixture.records.get('work-1')?.runtimeState).toBe('idle');
    expect(fixture.records.get('work-1')?.routing.nextRetryAt).toBeUndefined();
  });

  it('resumes a blocked work item once every named blocker reached a terminal stage', async () => {
    // arrange
    const item = workItem('work-1', 'qualified');
    const blocker = workItem('work-2', 'done');
    const fixture = createFixture([item, blocker]);
    // act
    await fixture.engine.applyRunResult(item, {
      runId: 'execution-1',
      role: 'analyze',
      outcome: 'blocked',
      summary: 'Depends on the retention decision.',
      evidence: [],
      blockingWorkItemIds: ['work-2'],
      finishedAt: '2026-08-19T10:00:00.000Z',
    });
    // assert
    expect(fixture.records.get('work-1')?.runtimeState).toBe('blocked');

    await expect(fixture.maintenance.runOnce()).resolves.toMatchObject({ resumedBlocked: 1 });
    expect(fixture.startForWorkItem).toHaveBeenCalledTimes(1);
    expect(fixture.records.get('work-1')?.routing.blockingWorkItemIds).toBeUndefined();
  });

  it('keeps a blocked item held while its blocker is still open', async () => {
    // arrange
    const item = workItem('work-1', 'qualified');
    const blocker = workItem('work-2', 'progress');
    const fixture = createFixture([item, blocker]);
    // act
    await fixture.engine.applyRunResult(item, {
      runId: 'execution-1',
      role: 'analyze',
      outcome: 'blocked',
      summary: 'Depends on open work.',
      evidence: [],
      blockingWorkItemIds: ['work-2'],
      finishedAt: '2026-08-19T10:00:00.000Z',
    });

    // assert
    await expect(fixture.maintenance.runOnce()).resolves.toMatchObject({ resumedBlocked: 0 });
    expect(fixture.startForWorkItem).not.toHaveBeenCalled();
    expect(fixture.records.get('work-1')?.runtimeState).toBe('blocked');
  });

  it('escalates a blocked item whose blocker no longer exists', async () => {
    // arrange
    const item = workItem('work-1', 'qualified');
    const fixture = createFixture([item]);
    // act
    await fixture.engine.applyRunResult(item, {
      runId: 'execution-1',
      role: 'analyze',
      outcome: 'blocked',
      summary: 'Depends on removed work.',
      evidence: [],
      blockingWorkItemIds: ['work-9'],
      finishedAt: '2026-08-19T10:00:00.000Z',
    });

    // assert
    await expect(fixture.maintenance.runOnce()).resolves.toMatchObject({ escalated: 1 });
    const record = fixture.records.get('work-1');
    expect(record?.runtimeState).toBe('human-required');
    expect(record?.humanRequest?.rationale).toContain('work-9');
  });

  it('adopts a stage that drifted on the board without waiting for activity on the item', async () => {
    // arrange
    const item = workItem('work-1', 'qualified');
    const fixture = createFixture([item]);
    await fixture.engine.applyRunResult(item, {
      runId: 'execution-1',
      role: 'analyze',
      outcome: 'retry',
      reasonCode: 'transient-tool-error',
      summary: 'Provider timeout.',
      evidence: [],
      finishedAt: '2026-08-19T10:00:00.000Z',
    });
    // Somebody moved the card meanwhile; the record still says qualified.
    const drifted = { ...item, stageId: 'backlog' };
    const driftedFixture = createFixture([drifted]);
    // act
    driftedFixture.records.set('work-1', fixture.records.get('work-1')!);

    // assert
    await expect(driftedFixture.maintenance.runOnce()).resolves.toMatchObject({
      reconciledStages: 1,
    });
    expect(driftedFixture.records.get('work-1')?.stageId).toBe('backlog');
  });

  it('escalates a verification-gated stage that holds an item without a verified commit', async () => {
    // arrange
    const item = workItem('work-1', 'acceptance');
    const fixture = createFixture([item]);
    // First contact creates the record from the board stage - with no verification recorded.
    // act
    fixture.engine.ensureRecord(item);

    // assert
    await expect(fixture.maintenance.runOnce()).resolves.toMatchObject({ escalated: 1 });
    const record = fixture.records.get('work-1');
    expect(record?.runtimeState).toBe('human-required');
    expect(record?.humanRequest?.rationale).toContain('passing verification');
  });

  it('escalates visibly when the due resumption cannot start', async () => {
    // arrange
    const item = workItem('work-1', 'qualified');
    const fixture = createFixture([item]);
    await holdWithRetry(fixture, item);
    fixture.setNow('2026-08-19T10:10:00.000Z');
    // act
    fixture.startForWorkItem.mockRejectedValueOnce(new Error('No analysis skill is active.'));

    // assert
    await expect(fixture.maintenance.runOnce()).resolves.toMatchObject({ escalated: 1 });
    const record = fixture.records.get('work-1');
    expect(record?.runtimeState).toBe('human-required');
    expect(record?.humanRequest?.rationale).toContain('No analysis skill is active.');
  });
});
