// #region Imports

import type { IExecutionRecord } from '@symphony/domain-execution';
import { describe, expect, it } from 'vitest';
import { resolveImplementationBranchUrl } from './resolveImplementationBranchUrl';

// #endregion

const execution: IExecutionRecord = {
  id: 'execution-1',
  workspaceId: 'workspace-1',
  bindingSnapshot: {
    workspaceId: 'workspace-1',
    deliveryContextId: 'delivery-1',
    workItemSourceId: 'source-1',
    workTrackingConnectionId: 'connection-1',
    repositoryBindingIds: ['repository-1'],
    sourceControlConnectionIds: ['connection-1'],
    ciBindingIds: [],
    skillFlowRole: 'solution',
    agentTeamId: 'team-1',
    positionId: 'position-1',
    agentRoutePolicyId: 'route-1',
    agentRouteCandidateId: 'route-candidate-1',
    aiConnectionId: 'ai-1',
    agentProfileId: 'agent-1',
    model: null,
    reasoningEffort: null,
  },
  workItemId: 'work-item-1',
  workflowId: 'workflow-1',
  state: 'succeeded',
  startedAt: '2026-08-12T08:00:00.000Z',
  workspaceReference: 'codex/work-121/test branch',
};

describe('resolveImplementationBranchUrl', () => {
  it('does not invent a remote URL for a branch that exists only in the local worktree', () => {
    // act
    const actual = resolveImplementationBranchUrl(execution);

    // assert
    expect(actual).toBeUndefined();
  });

  it('returns the provider-confirmed branch URL after pull-request publication', () => {
    // arrange
    const published: IExecutionRecord = {
      ...execution,
      pullRequest: {
        number: 121,
        externalUrl: 'https://github.com/RueDeRennes/symphony/pull/121',
        branchUrl: 'https://github.com/RueDeRennes/symphony/tree/codex/work-121/test%20branch',
      },
    };

    // act
    const actual = resolveImplementationBranchUrl(published);

    // assert
    expect(actual).toBe(published.pullRequest?.branchUrl);
  });
});
