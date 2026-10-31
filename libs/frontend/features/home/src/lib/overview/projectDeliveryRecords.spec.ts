// #region Imports

import { defaultWorkflow, type IWorkflowStageChange } from '@symphony/domain-workflow';
import { describe, expect, it } from 'vitest';
import { projectDeliveryRecords } from './projectDeliveryRecords';

// #endregion

function moved(workItemId: string, toStageId: string, changedAt: string): IWorkflowStageChange {
  return { workItemId, toStageId, changedAt };
}

describe('projectDeliveryRecords', () => {
  it('takes the latest move into Done and the first move into Qualified per work item', () => {
    // arrange
    const changes = [
      moved('reopened', 'done', '2026-10-20T10:00:00.000Z'),
      moved('reopened', 'qualified', '2026-10-01T10:00:00.000Z'),
      moved('reopened', 'progress', '2026-10-22T10:00:00.000Z'),
      moved('reopened', 'qualified', '2026-10-21T10:00:00.000Z'),
      moved('reopened', 'done', '2026-10-28T10:00:00.000Z'),
      moved('unqualified', 'done', '2026-10-27T10:00:00.000Z'),
      moved('open', 'qualified', '2026-10-26T10:00:00.000Z'),
    ];

    // act
    const actual = projectDeliveryRecords(changes, defaultWorkflow);

    // assert
    expect(actual).toEqual([
      {
        workItemId: 'reopened',
        qualifiedAt: '2026-10-01T10:00:00.000Z',
        doneAt: '2026-10-28T10:00:00.000Z',
      },
      { workItemId: 'unqualified', doneAt: '2026-10-27T10:00:00.000Z' },
    ]);
  });

  it('resolves Done and Qualified from the workflow definition, not from fixed identifiers', () => {
    // arrange
    const workflow = {
      initialStageId: 'inbox',
      stages: [
        { id: 'inbox', label: 'Inbox', description: '', kind: 'human-gate' as const },
        { id: 'shaping', label: 'Shaping', description: '', kind: 'automated' as const },
        {
          id: 'triaged',
          label: 'Triaged',
          description: '',
          kind: 'automated' as const,
          roles: ['analyze' as const],
        },
        { id: 'shipped', label: 'Shipped', description: '', kind: 'terminal' as const },
      ],
    };
    const changes = [
      moved('item', 'shaping', '2026-10-01T10:00:00.000Z'),
      moved('item', 'triaged', '2026-10-02T10:00:00.000Z'),
      moved('item', 'shipped', '2026-10-05T10:00:00.000Z'),
    ];

    // act
    const actual = projectDeliveryRecords(changes, workflow);
    const withoutAnalysis = projectDeliveryRecords(changes, {
      ...workflow,
      stages: workflow.stages.map((stage) => ({ ...stage, roles: [] })),
    });

    // assert
    expect(actual).toEqual([
      {
        workItemId: 'item',
        qualifiedAt: '2026-10-02T10:00:00.000Z',
        doneAt: '2026-10-05T10:00:00.000Z',
      },
    ]);
    expect(withoutAnalysis[0]?.qualifiedAt).toBe('2026-10-01T10:00:00.000Z');
  });
});
