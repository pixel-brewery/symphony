// #region Imports

import { describe, expect, it } from 'vitest';
import type { IGoalRecord, IGoalReviewDecision } from '@symphony/domain-execution';
import { createMemoryExecutionRepository } from '../testing/createMemoryExecutionRepository';
import { ExecutionPublicationService } from './ExecutionPublicationService';

// #endregion

describe('ExecutionPublicationService', () => {
  it('keeps an immediate query failure from escaping acceptance-note publication', async () => {
    // arrange
    let reads = 0;
    let notes = 0;
    let events = 0;
    const service = new ExecutionPublicationService({
      repository: createMemoryExecutionRepository(),
      workspace: { isAvailable: async () => true },
      remoteProjectionQueries: {
        loadOperationalWorkItems: () => {
          reads += 1;
          throw new Error('The Work Item provider failed before returning its promise.');
        },
      },
      tracker: {
        publishWorkItemNote: async () => {
          notes += 1;
        },
      },
      synchronizeDeliveryGroupPullRequest: async () => undefined,
      record: async () => {
        events += 1;
      },
    });
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
        objective: 'Implement the accepted task.',
        assignedAt: '2026-08-07T00:00:00.000Z',
        updatedAt: '2026-08-07T00:00:00.000Z',
      },
      state: 'achieved',
      currentRole: 'pull-request-review',
      currentExecutionId: 'execution-1',
      handoffs: [],
      verificationReports: [],
      reviewDecisions: [],
      createdAt: '2026-08-07T00:00:00.000Z',
      updatedAt: '2026-08-07T00:00:00.000Z',
    };
    const review: IGoalReviewDecision = {
      id: 'review-1',
      recordedAt: '2026-08-07T00:00:00.000Z',
      decision: 'approved',
      message: 'Accepted.',
    };

    // act
    const publication = service.publishAcceptanceNote(goal, review);

    // assert
    await expect(publication).resolves.toBeUndefined();
    expect(reads).toBe(1);
    expect(notes).toBe(0);
    expect(events).toBe(0);
  });
});
