// #region Imports

import { describe, expect, it } from 'vitest';
import type { IGoalRecord } from '@symphony/domain-execution';
import { createMemoryExecutionRepository } from '../testing/createMemoryExecutionRepository';
import { ExecutionGoalService } from './ExecutionGoalService';

// #endregion

describe('ExecutionGoalService', () => {
  it('persists the acceptance decision before publishing its tracker note', async () => {
    // arrange
    const repository = createMemoryExecutionRepository();
    const goal: IGoalRecord = {
      id: 'goal-1',
      workspaceId: 'workspace-1',
      workItemId: 'item-1',
      assignment: {
        id: 'assignment-1',
        workspaceId: 'workspace-1',
        workItemId: 'item-1',
        agentTeamId: 'team-1',
        responsibleAgentId: 'agent-1',
        objective: 'Implement the approved task.',
        assignedAt: '2026-08-07T00:00:00.000Z',
        updatedAt: '2026-08-07T00:00:00.000Z',
      },
      state: 'reviewing',
      currentRole: 'pull-request-review',
      handoffs: [],
      verificationReports: [
        {
          id: 'verification-1',
          executionId: 'execution-1',
          recordedAt: '2026-08-07T00:00:00.000Z',
          state: 'passed',
          changedFiles: ['src/task.ts'],
          diffLines: 4,
          checks: [{ label: 'Repository verification', state: 'passed' }],
        },
      ],
      reviewDecisions: [],
      createdAt: '2026-08-07T00:00:00.000Z',
      updatedAt: '2026-08-07T00:00:00.000Z',
    };
    repository.saveGoal(goal);
    let persistedAtPublication: IGoalRecord | undefined;
    const service = new ExecutionGoalService({
      repository,
      clock: { now: () => '2026-08-07T00:01:00.000Z' },
      ids: { next: (prefix) => `${prefix}-1` },
      remoteProjectionQueries: {
        loadWorkItemDetails: async () => {
          throw new Error('Work Item hydration is not part of acceptance.');
        },
      },
      activeDeliveryGroupForRoot: () => undefined,
      latestExecution: () => {
        throw new Error('Execution lookup is not part of acceptance.');
      },
      publishAcceptanceNote: async () => {
        persistedAtPublication = repository.listGoals()[0];
        throw new Error('The tracker is unavailable.');
      },
    });

    // act
    const review = service.reviewGoal('item-1', 'approved', '  Accepted.  ');

    // assert
    await expect(review).rejects.toThrow('The tracker is unavailable.');
    expect(persistedAtPublication).toMatchObject({
      state: 'achieved',
      reviewDecisions: [{ decision: 'approved', message: 'Accepted.' }],
    });
    expect(repository.listGoals()[0]).toBe(persistedAtPublication);
  });
});
