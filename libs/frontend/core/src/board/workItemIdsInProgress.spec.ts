// #region Imports

import type { IExecutionRecord } from '@symphony/domain-execution';
import type { IWorkItem } from '@symphony/domain-work';
import { describe, expect, it } from 'vitest';
import { workItemIdsInProgress } from './workItemIdsInProgress';

// #endregion

function item(id: string): IWorkItem {
  return {
    id,
    externalId: `#${id}`,
    title: 'Item',
    body: '',
    stageId: 'backlog',
    provider: 'github-projects',
    repository: 'owner/repository',
    labels: [],
    assignees: [],
  };
}

function execution(overrides: Partial<IExecutionRecord> & Pick<IExecutionRecord, 'id'>) {
  return {
    workItemId: 'work-1',
    workflowId: 'workflow-1',
    state: 'running',
    startedAt: '2026-08-24T10:00:00.000Z',
    ...overrides,
  } satisfies IExecutionRecord;
}

describe('workItemIdsInProgress', () => {
  it('reports an item a runner is executing right now', () => {
    // arrange
    // act
    const ids = workItemIdsInProgress([item('work-1')], [execution({ id: 'run-1' })]);

    // assert
    expect(ids).toEqual(new Set(['work-1']));
  });

  it('reports an item whose run is waiting to resume, matching the board spinner', () => {
    // arrange
    // act
    const ids = workItemIdsInProgress(
      [item('work-1')],
      [execution({ id: 'run-1', state: 'waiting' })],
    );

    // assert
    expect(ids).toEqual(new Set(['work-1']));
  });

  it('leaves a queued run out, because nothing is being worked on yet', () => {
    // arrange
    // act
    const ids = workItemIdsInProgress(
      [item('work-1')],
      [execution({ id: 'run-1', state: 'queued' })],
    );

    // assert
    expect(ids).toEqual(new Set());
  });

  it('reads only the newest run, so a finished item stops reporting progress', () => {
    // arrange
    // act
    const ids = workItemIdsInProgress(
      [item('work-1')],
      [
        execution({ id: 'run-1', state: 'running', startedAt: '2026-08-24T09:00:00.000Z' }),
        execution({ id: 'run-2', state: 'succeeded', startedAt: '2026-08-24T10:00:00.000Z' }),
      ],
    );

    // assert
    expect(ids).toEqual(new Set());
  });

  it('ignores a run of an item outside the given scope', () => {
    // arrange
    // act
    const ids = workItemIdsInProgress(
      [item('work-1')],
      [execution({ id: 'run-1', workItemId: 'work-2' })],
    );

    // assert
    expect(ids).toEqual(new Set());
  });
});
