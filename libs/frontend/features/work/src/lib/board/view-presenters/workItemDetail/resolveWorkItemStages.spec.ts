// #region Imports

import type { IExecutionRecord } from '@symphony/domain-execution';
import { describe, expect, it } from 'vitest';
import type { IWorkItemCheck } from './IWorkItemCheck';
import { resolveWorkItemStages } from './resolveWorkItemStages';

// #endregion

function execution(overrides: Partial<IExecutionRecord>): IExecutionRecord {
  return {
    id: 'execution-1',
    workItemId: 'work-1',
    workflowId: 'workflow',
    kind: 'analysis',
    state: 'succeeded',
    startedAt: '2026-10-28T10:00:00.000Z',
    finishedAt: '2026-10-28T10:30:00.000Z',
    summary: 'Analysis',
    bindingSnapshot: { agentProfileId: 'codex' } as IExecutionRecord['bindingSnapshot'],
    ...overrides,
  };
}

const check = (status: IWorkItemCheck['status']): IWorkItemCheck => ({
  id: status,
  name: status,
  status,
  source: 'workflow',
});

describe('resolveWorkItemStages', () => {
  it('follows the card progress and names the agent, the pull request and the running checks', () => {
    // arrange
    const executions = [
      execution({}),
      execution({
        id: 'execution-2',
        kind: 'solution',
        startedAt: '2026-10-31T16:00:00.000Z',
        finishedAt: '2026-10-31T16:48:00.000Z',
        pullRequest: {
          number: 714,
          externalUrl: 'https://github.com/o/r/pull/714',
          branchUrl: 'https://github.com/o/r/tree/claude/cr-0602',
        },
        workspaceReference: 'claude/cr-0602',
      }),
    ];

    // act
    const actual = resolveWorkItemStages({
      progress: { status: 'running', completedSteps: 3, activeStep: 3 },
      executions,
      checks: [check('succeeded'), check('in-progress'), check('succeeded')],
      agents: [{ id: 'codex', displayName: 'Codex' }],
    });

    // assert
    expect(actual.map((stage) => [stage.id, stage.state])).toEqual([
      ['analysis', 'done'],
      ['solution', 'done'],
      ['implementation', 'done'],
      ['checks', 'current'],
      ['acceptance', 'pending'],
    ]);
    expect(actual[0]).toMatchObject({ agentName: 'Codex', at: '2026-10-28T10:30:00.000Z' });
    expect(actual[2]).toMatchObject({ pullRequestNumber: 714, branch: 'claude/cr-0602' });
    expect(actual[3]).toMatchObject({ checksTotal: 3, checksRunning: 1, checksPassed: 2 });
  });

  it('marks the blocked step failed only when the card reports a failure', () => {
    // act
    const failed = resolveWorkItemStages({
      progress: { status: 'failed', completedSteps: 0, activeStep: 0, blockedStep: 0 },
      executions: [execution({ state: 'failed', summary: undefined })],
      checks: [],
      agents: [],
    });
    const waiting = resolveWorkItemStages({
      progress: { status: 'waiting-for-you', completedSteps: 0, activeStep: 0, blockedStep: 0 },
      executions: [],
      checks: [],
      agents: [],
    });

    // assert
    expect(failed[0]).toMatchObject({ state: 'failed', activity: 'failed' });
    expect(waiting[0]?.state).toBe('current');
  });

  it('reports a finished delivery as five done stages', () => {
    // act
    const actual = resolveWorkItemStages({
      progress: { status: 'done', completedSteps: 5, activeStep: 4 },
      executions: [],
      checks: [],
      agents: [],
    });

    // assert
    expect(actual.every((stage) => stage.state === 'done')).toBe(true);
  });
});
