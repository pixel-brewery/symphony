// #region Imports

import { defaultWorkflow } from '@symphony/domain-workflow';
import { type IExecutionRecord } from '@symphony/domain-execution';
import { type IWorkItem } from '@symphony/domain-work';
import { describe, expect, it } from 'vitest';
import { workItemIdsNeedingAttention } from './workItemIdsNeedingAttention';

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
    state: 'failed',
    startedAt: '2026-08-20T10:00:00.000Z',
    ...overrides,
  } satisfies IExecutionRecord;
}

describe('workItemIdsNeedingAttention', () => {
  it('reports an item whose newest execution failed', () => {
    // act
    // arrange
    const ids = workItemIdsNeedingAttention(
      [item('work-1')],
      [
        execution({ id: 'run-1', state: 'succeeded', startedAt: '2026-08-20T09:00:00.000Z' }),
        execution({ id: 'run-2', state: 'failed', startedAt: '2026-08-20T10:00:00.000Z' }),
      ],
    );

    // assert
    expect(ids).toEqual(new Set(['work-1']));
  });

  it('forgives an old failure once a later run recovered the item', () => {
    // act
    // arrange
    const ids = workItemIdsNeedingAttention(
      [item('work-1')],
      [
        execution({ id: 'run-1', state: 'failed', startedAt: '2026-08-20T09:00:00.000Z' }),
        execution({ id: 'run-2', state: 'succeeded', startedAt: '2026-08-20T10:00:00.000Z' }),
      ],
    );

    // assert
    expect(ids.size).toBe(0);
  });

  it('reports an item the stage guards would refuse although every run succeeded', () => {
    // arrange
    const board = item('work-1');
    // act
    const ids = workItemIdsNeedingAttention(
      [{ ...board, stageId: 'ready', repositoryBindingIds: ['binding-1'] }],
      [execution({ id: 'run-1', state: 'succeeded', kind: 'analysis', summary: 'Analyzed.' })],
      {
        stages: defaultWorkflow.stages,
        fields: [],
        readiness: [
          {
            workItemId: 'work-1',
            analysisStored: true,
            readyForSolve: false,
            riskClass: 'medium',
            openDecisions: ['Which locales are in scope?'],
            hardDependencyIds: [],
            running: false,
          },
        ],
      },
    );

    // assert
    expect(ids).toEqual(new Set(['work-1']));
  });

  it('leaves an item alone whose stored analysis proves it ready', () => {
    // arrange
    const board = item('work-1');
    // act
    const ids = workItemIdsNeedingAttention(
      [{ ...board, stageId: 'ready', repositoryBindingIds: ['binding-1'] }],
      [execution({ id: 'run-1', state: 'succeeded', kind: 'analysis', summary: 'Analyzed.' })],
      {
        stages: defaultWorkflow.stages,
        fields: [],
        readiness: [
          {
            workItemId: 'work-1',
            analysisStored: true,
            readyForSolve: true,
            riskClass: 'medium',
            openDecisions: [],
            hardDependencyIds: [],
            running: false,
          },
        ],
      },
    );

    // assert
    expect(ids.size).toBe(0);
  });

  it('ignores failures of items that are no longer on the board', () => {
    // act
    // arrange
    const ids = workItemIdsNeedingAttention(
      [item('work-2')],
      [execution({ id: 'run-1', workItemId: 'work-gone' })],
    );

    // assert
    expect(ids.size).toBe(0);
  });
});
