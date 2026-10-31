// #region Imports

import { describe, expect, it } from 'vitest';
import type { IExecutionRecord } from '@symphony/domain-execution';
import type { IWorkItem } from '@symphony/domain-work';
import { defaultWorkflow } from '@symphony/domain-workflow';
import { createMemoryExecutionRepository } from '../testing/createMemoryExecutionRepository';
import type { IExecutionAdmissionDependencies } from './IExecutionAdmissionDependencies';
import { ExecutionAdmissionService } from './ExecutionAdmissionService';
import { ExecutionCapacityError } from '../analyzer/ExecutionCapacityError';

// #endregion

const workItem: IWorkItem = {
  id: 'item-1',
  externalId: '#1',
  title: 'Preserve execution admission',
  body: '',
  stageId: 'qualified',
  provider: 'test',
  repository: 'test/repository',
  labels: [],
  assignees: [],
  updatedAt: '2026-08-07T00:00:00.000Z',
};

const execution: IExecutionRecord = {
  id: 'execution-1',
  workItemId: workItem.id,
  workflowId: defaultWorkflow.id,
  state: 'running',
  startedAt: '2026-08-07T00:00:00.000Z',
};

function createFixture(startAnalysis: IExecutionAdmissionDependencies['startAnalysis']) {
  const repository = createMemoryExecutionRepository();
  let nextId = 0;
  const service = new ExecutionAdmissionService({
    repository,
    maxParallelExecutions: () => 1,
    clock: { now: () => '2026-08-07T00:00:00.000Z' },
    ids: { next: (prefix) => `${prefix}-${++nextId}` },
    remoteProjectionQueries: {
      loadOperationalWorkItems: async () => [workItem],
      recordWorkItem: () => undefined,
    },
    assertStageAllowsRole: () => undefined,
    workflow: () => defaultWorkflow,
    isActive: (state) => state === 'queued' || state === 'running' || state === 'waiting',
    resumeExecution: async () => execution,
    startAnalysis,
    startSolver: async () => execution,
  });
  return { repository, service };
}

describe('ExecutionAdmissionService', () => {
  it('holds capacity across an asynchronous start and releases a rejected reservation', async () => {
    // arrange
    let rejectStart: (cause: Error) => void = () => undefined;
    const pending = new Promise<IExecutionRecord>((_resolve, reject) => {
      rejectStart = reject;
    });
    let attempts = 0;
    const { service } = createFixture(async () => {
      attempts += 1;
      return attempts === 1 ? pending : execution;
    });

    // act
    const firstStart = service.start(false, workItem.id);
    const concurrentStart = service.start(false, workItem.id);

    // assert
    await expect(concurrentStart).rejects.toBeInstanceOf(ExecutionCapacityError);
    expect(attempts).toBe(1);
    rejectStart(new Error('Workspace preparation failed.'));
    await expect(firstStart).rejects.toThrow('Workspace preparation failed.');
    await expect(service.start(false, workItem.id)).resolves.toBe(execution);
    expect(attempts).toBe(2);
  });

  it('keeps waiting work untouched until a bulk lifecycle suspension finishes', async () => {
    // arrange
    let starts = 0;
    const { repository, service } = createFixture(async () => {
      starts += 1;
      return execution;
    });
    repository.saveExecutionQueueEntry({
      id: 'queue-1',
      workItemId: workItem.id,
      workItemExternalId: workItem.externalId,
      workItemTitle: workItem.title,
      kind: 'analysis',
      origin: 'operator',
      queuedAt: '2026-08-07T00:00:00.000Z',
    });

    // act
    const suspended = await service.withQueueDrainSuspended(() => service.drainExecutionQueue());

    // assert
    expect(suspended).toBe(0);
    expect(starts).toBe(0);
    expect(repository.listExecutionQueue()).toHaveLength(1);
    expect(await service.drainExecutionQueue()).toBe(1);
    expect(starts).toBe(1);
    expect(repository.listExecutionQueue()).toEqual([]);
  });
});
