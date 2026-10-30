// #region Imports

import { describe, expect, it } from 'vitest';
import { workflowResponseSchemas as responseSchemas } from './WorkflowResponseSchemas';

// #endregion

describe('WorkflowResponseSchemas', () => {
  it('carries the record and the audit trail back to the renderer', () => {
    // act
    // arrange
    const response = responseSchemas['workflow.get'].parse({
      record: {
        workItemId: 'work-1',
        stageId: 'progress',
        runtimeState: 'running',
        updatedAt: '2026-08-19T10:05:00.000Z',
      },
      audit: [
        {
          id: 'audit-1',
          sequence: 1,
          occurredAt: '2026-08-19T10:01:00.000Z',
          kind: 'stage-changed',
          fromStageId: 'ready',
          toStageId: 'progress',
          role: 'solve',
          actor: 'supervisor',
          detail: 'ready → progress',
        },
        {
          id: 'audit-2',
          sequence: 2,
          occurredAt: '2026-08-19T10:02:00.000Z',
          kind: 'guard-rejected',
          actor: 'supervisor',
          detail: 'Claim could not be acquired.',
          failedGuards: ['claim-acquired'],
        },
      ],
    });

    // assert
    expect(response.audit).toHaveLength(2);
    expect(response.audit[1]?.failedGuards).toEqual(['claim-acquired']);
  });

  it('rejects an audit entry with a guard the engine cannot evaluate', () => {
    // arrange
    // act
    // assert
    expect(() =>
      responseSchemas['workflow.get'].parse({
        audit: [
          {
            id: 'audit-1',
            sequence: 1,
            occurredAt: '2026-08-19T10:01:00.000Z',
            kind: 'guard-rejected',
            actor: 'supervisor',
            detail: 'invented guard',
            failedGuards: ['no-such-guard'],
          },
        ],
      }),
    ).toThrow();
  });
});
