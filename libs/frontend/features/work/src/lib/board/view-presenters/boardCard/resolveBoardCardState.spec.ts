// #region Imports

import { type IExecutionRecord } from '@symphony/domain-execution';
import { defaultWorkflow } from '@symphony/domain-workflow';
import { type IWorkItem } from '@symphony/domain-work';
import { describe, expect, it } from 'vitest';
import type { IBoardPullRequestContext } from '../boardPullRequestAction';
import { resolveBoardCardState } from './';

// #endregion

const workItem: IWorkItem = {
  id: 'work-1',
  externalId: '#1',
  title: 'Board card',
  body: '',
  stageId: 'qualified',
  provider: 'simulated',
  repository: 'owner/repository',
  labels: [],
  assignees: [],
};

function execution(overrides: Partial<IExecutionRecord>): IExecutionRecord {
  return {
    id: 'execution-1',
    workItemId: workItem.id,
    workflowId: 'workflow',
    kind: 'analysis',
    state: 'succeeded',
    startedAt: '2026-08-13T10:00:00.000Z',
    ...overrides,
  };
}

function state(
  stageId: string,
  overrides: Partial<Parameters<typeof resolveBoardCardState>[0]> = {},
) {
  return resolveBoardCardState({
    item: { ...workItem, stageId },
    stages: defaultWorkflow.stages,
    executions: [],
    needsAttention: false,
    columnLabel: 'Column',
    ...overrides,
  });
}

describe('resolveBoardCardState', () => {
  it('counts the delivery steps the workflow stage has behind it', () => {
    // act
    const actual = ['backlog', 'qualified', 'ready', 'progress', 'acceptance', 'done'].map(
      (stageId) => state(stageId).completedSteps,
    );

    // assert
    expect(actual).toEqual([0, 0, 2, 2, 4, 5]);
  });

  it('counts a stored analysis and a delivered pull request as done steps', () => {
    // arrange
    const pullRequest = {
      reference: { number: 7, externalUrl: 'https://example.test/pull/7' },
    } as IBoardPullRequestContext;

    // act
    const analysed = state('qualified', {
      readiness: {
        workItemId: workItem.id,
        analysisStored: true,
        readyForSolve: false,
        openDecisions: [],
        hardDependencyIds: [],
        running: false,
      },
    });
    const implemented = state('progress', { pullRequest });

    // assert
    expect(analysed.completedSteps).toBe(1);
    expect(implemented.completedSteps).toBe(3);
  });

  it('reports the stage as the status of an item that only rests there', () => {
    // act
    const ready = state('ready');
    const review = state('acceptance');
    const qualified = state('qualified', { columnLabel: 'Qualified' });

    // assert
    expect(ready.status).toBe('ready-for-agent');
    expect(review.status).toBe('ready-to-review');
    expect(qualified).toMatchObject({ status: 'stage', stageLabel: 'Qualified' });
  });

  it('marks the step that waits on a person', () => {
    // act
    const blocked = state('ready', { needsAttention: true });
    const failed = state('qualified', {
      needsAttention: true,
      executions: [execution({ state: 'failed' })],
    });

    // assert
    expect(blocked).toMatchObject({ status: 'waiting-for-you', blockedStep: 2 });
    expect(failed).toMatchObject({ status: 'failed', activeStep: 0, blockedStep: 0 });
  });

  it('names the step a running execution works on, from its newest run', () => {
    // act
    const analysing = state('qualified', {
      executions: [execution({ state: 'running' })],
    });
    const implementing = state('progress', {
      executions: [
        execution({ state: 'failed', startedAt: '2026-08-13T09:00:00.000Z' }),
        execution({ id: 'execution-2', kind: 'solution', state: 'running' }),
      ],
    });

    // assert
    expect(analysing).toMatchObject({ status: 'running', activeStep: 0 });
    expect(implementing).toMatchObject({ status: 'running', activeStep: 2 });
  });

  it('reports the delivered pull request when nothing else is happening', () => {
    // arrange
    const pullRequest = (baseBranchStatus: 'behind' | 'conflicting') =>
      ({
        reference: { number: 7, externalUrl: 'https://example.test/pull/7' },
        summary: { baseBranchStatus },
      }) as IBoardPullRequestContext;

    // act
    const behind = state('acceptance', { pullRequest: pullRequest('behind') });
    const conflicting = state('acceptance', { pullRequest: pullRequest('conflicting') });

    // assert
    expect(behind.status).toBe('behind-base');
    expect(conflicting.status).toBe('conflicting');
  });

  it('shows the agent of the newest run, or else the first assignee', () => {
    // act
    const agent = state('progress', { agentName: 'Claude Code' });
    const assignee = resolveBoardCardState({
      item: {
        ...workItem,
        assignees: [{ login: 'octo', displayName: 'Octo Operator', avatarUrl: 'avatar.png' }],
      },
      stages: defaultWorkflow.stages,
      executions: [],
      needsAttention: false,
      columnLabel: 'Qualified',
    });

    // assert
    expect(agent.avatar).toEqual({ name: 'Claude Code' });
    expect(assignee.avatar).toEqual({ name: 'Octo Operator', imageUrl: 'avatar.png' });
  });

  it('reports ownership another orchestrator holds', () => {
    // act
    const actual = state('qualified', { coordination: { action: 'analyze', owner: 'octo' } });

    // assert
    expect(actual).toMatchObject({
      status: 'elsewhere',
      coordinationAction: 'analyze',
      coordinationOwner: 'octo',
    });
  });
});
