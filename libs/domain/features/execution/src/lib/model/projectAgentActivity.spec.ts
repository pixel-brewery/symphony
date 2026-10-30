// #region Imports

import { describe, expect, it } from 'vitest';
import type { IAgentProfile } from '@symphony/domain-team';
import type { IExecutionRecord } from './IExecutionRecord';
import type { IAgentActivityProjectionContext } from './IAgentActivityProjectionContext';
import { projectAgentActivity } from './projectAgentActivity';

// #endregion

const employee: IAgentProfile = {
  id: 'employee-a',
  workspaceId: 'personal',
  displayName: 'Ada',
  positionId: 'developer',
  routePolicyId: 'route',
  qualificationTags: [],
  enabled: true,
};
function snapshot(executions: readonly IExecutionRecord[]): IAgentActivityProjectionContext {
  return { executions };
}
function execution(
  id: string,
  state: IExecutionRecord['state'],
  agent = 'employee-a',
): IExecutionRecord {
  return {
    id,
    workItemId: id,
    workflowId: 'custom',
    state,
    startedAt: '2026-10-06T10:00:00.000Z',
    bindingSnapshot: {
      workspaceId: 'personal',
      deliveryContextId: 'context',
      workItemSourceId: 'source',
      workTrackingConnectionId: 'tracker',
      repositoryBindingIds: ['repo'],
      sourceControlConnectionIds: ['git'],
      ciBindingIds: [],
      skillFlowRole: 'analysis',
      agentTeamId: 'team',
      positionId: 'developer',
      agentRoutePolicyId: 'route',
      aiConnectionId: 'codex-account',
      agentProfileId: agent,
      model: null,
      reasoningEffort: null,
    },
  };
}

describe('projectAgentActivity', () => {
  it('retains simultaneous work and prioritises real requests for input', () => {
    // arrange
    const source = snapshot([execution('one', 'running'), execution('two', 'waiting')]);
    // act
    const activity = projectAgentActivity([employee], source, true)[0]!;
    // assert
    expect(activity.state).toBe('needs-input');
    expect(activity.work).toHaveLength(2);
    expect(activity.work[0]?.workItemId).toBe('two');
  });
  it('keeps the executing employee despite next-phase reassignment and a different CLI', () => {
    // arrange
    const run = execution('one', 'running');
    const source: IAgentActivityProjectionContext = {
      executions: [run],
      goals: [
        {
          id: 'goal',
          workspaceId: 'personal',
          workItemId: 'one',
          state: 'implementing',
          currentRole: 'solution',
          currentExecutionId: run.id,
          executingAgentId: employee.id,
          assignment: {
            id: 'assignment',
            workspaceId: 'personal',
            workItemId: 'one',
            agentTeamId: 'team',
            responsibleAgentId: 'employee-b',
            objective: 'Next phase',
            assignedAt: run.startedAt,
            updatedAt: run.startedAt,
          },
          handoffs: [],
          verificationReports: [],
          reviewDecisions: [],
          createdAt: run.startedAt,
          updatedAt: run.startedAt,
        },
      ],
    };
    // act
    const activities = projectAgentActivity(
      [employee, { ...employee, id: 'employee-b' }],
      source,
      true,
    );
    // assert
    expect(activities[0]?.state).toBe('working');
    expect(activities[0]?.work[0]?.connectionId).toBe('codex-account');
    expect(activities[1]?.state).toBe('idle');
  });
  it('stops working when the data is stale and retains the last known work', () => {
    // arrange
    const source = snapshot([execution('one', 'running')]);
    // act
    const activity = projectAgentActivity([employee], source, false)[0]!;
    // assert
    expect(activity.state).toBe('stale');
    expect(activity.work).toHaveLength(1);
    expect(activity.lastKnownAt).toBe(source.executions[0]?.startedAt);
  });
  it('does not reanimate an old completion after a newer phase', () => {
    // arrange
    const old = execution('old', 'succeeded');
    const next = {
      ...execution('new', 'failed'),
      workItemId: 'old',
      startedAt: '2026-10-06T11:00:00.000Z',
    };
    // act
    const activity = projectAgentActivity([employee], snapshot([old, next]), true)[0]!;
    // assert
    expect(activity.state).toBe('failed');
    expect(activity.work.map((work) => work.executionId)).toEqual(['new']);
  });

  it('keeps only the most recent result across different finished tickets', () => {
    // arrange
    const history = Array.from({ length: 30 }, (_, index) => ({
      ...execution(`finished-${index}`, index === 29 ? 'succeeded' : 'failed'),
      finishedAt: `2026-10-06T10:${String(index).padStart(2, '0')}:00.000Z`,
    }));
    // act
    const activity = projectAgentActivity([employee], snapshot(history.toReversed()), true)[0]!;
    // assert
    expect(activity.state).toBe('completed');
    expect(activity.work.map((work) => work.workItemId)).toEqual(['finished-29']);
    expect(activity.lastKnownAt).toBe(history[29]!.finishedAt);
  });

  it('preserves live parallel assignments without attaching old results or cancelled work', () => {
    // arrange
    const source = snapshot([
      execution('old-success', 'succeeded'),
      execution('old-failure', 'failed'),
      execution('cancelled', 'cancelled'),
      execution('running', 'running'),
      execution('waiting', 'waiting'),
      execution('queued', 'queued'),
    ]);
    // act
    const activities = projectAgentActivity(
      [employee, { ...employee, id: 'employee-b' }],
      source,
      true,
    );
    // assert
    expect(activities[0]?.work.map((work) => work.workItemId)).toEqual([
      'waiting',
      'running',
      'queued',
    ]);
    expect(activities[1]?.state).toBe('idle');
    expect(source.executions).toHaveLength(6);
  });

  it('does not turn a completed cancellation into a permanently paused employee', () => {
    // arrange
    const source = snapshot([execution('cancelled', 'cancelled')]);
    // act
    const activity = projectAgentActivity([employee], source, true)[0]!;
    // assert
    expect(activity.state).toBe('idle');
    expect(activity.work).toEqual([]);
  });

  it('retains a real resumable operator pause while excluding ordinary cancellations', () => {
    // arrange
    const source = snapshot([
      {
        ...execution('paused', 'cancelled'),
        pause: { reason: 'operator', pausedAt: '2026-10-06T10:10:00.000Z' },
      },
      execution('cancelled', 'cancelled'),
    ]);
    // act
    const activity = projectAgentActivity([employee], source, true)[0]!;
    // assert
    expect(activity.state).toBe('paused');
    expect(activity.work).toMatchObject([
      { workItemId: 'paused', state: 'paused', reason: 'operator' },
    ]);
    expect(activity.work).toHaveLength(1);
  });
});
