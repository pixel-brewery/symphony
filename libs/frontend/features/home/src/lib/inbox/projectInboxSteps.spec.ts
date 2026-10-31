// @vitest-environment jsdom

// #region Imports

import type { ICiRun } from '@symphony/domain-ci';
import type { IPullRequestSummary } from '@symphony/domain-delivery';
import type { IExecutionRecord } from '@symphony/domain-execution';
import type { IAgentProfile } from '@symphony/domain-team';
import type { IWorkItem } from '@symphony/domain-work';
import { defaultWorkflow } from '@symphony/domain-workflow';
import { describe, expect, it } from 'vitest';
import type { IInboxEntry } from './IInboxEntry';
import type { IInboxStepInput } from './IInboxStepInput';
import { projectInboxSteps } from './projectInboxSteps';

// #endregion

function item(stageId: string): IWorkItem {
  return {
    id: 'item',
    workspaceId: 'workspace',
    externalId: 'CR-1',
    title: 'Title',
    body: '',
    stageId,
    provider: 'simulated',
    repository: 'owner/repo',
    labels: [],
    assignees: [],
  };
}

function entry(kind: IInboxEntry['kind'], workItem?: IWorkItem): IInboxEntry {
  return {
    id: kind,
    group: 'decision',
    kind,
    at: '2026-10-30T10:00:00.000Z',
    ...(workItem ? { workItem } : {}),
    findings: [],
    options: [],
  };
}

const analysis: IExecutionRecord = {
  id: 'analysis',
  workItemId: 'item',
  workflowId: 'workflow',
  kind: 'analysis',
  mode: 'ai',
  state: 'succeeded',
  startedAt: '2026-10-27T08:00:00.000Z',
  finishedAt: '2026-10-27T09:00:00.000Z',
  summary: 'Ready.',
  bindingSnapshot: { agentProfileId: 'codex' } as IExecutionRecord['bindingSnapshot'],
};

function input(overrides: Partial<IInboxStepInput>): IInboxStepInput {
  return {
    entry: entry('solution', item('ready')),
    executions: [analysis],
    goals: [],
    stages: defaultWorkflow.stages,
    pullRequests: [],
    ciRuns: [],
    localCiExecutions: [],
    agents: [{ id: 'codex', displayName: 'Codex' } as IAgentProfile],
    ...overrides,
  };
}

describe('projectInboxSteps', () => {
  it('marks the analysis done and the solution as the decision that waits', () => {
    // arrange
    const projection = input({});

    // act
    const steps = projectInboxSteps(projection);

    // assert
    expect(steps).toEqual([
      { id: 'analysis', state: 'done', agentName: 'Codex', at: '2026-10-27T09:00:00.000Z' },
      { id: 'solution', state: 'attention' },
      { id: 'implementation', state: 'pending' },
      { id: 'checks', state: 'pending' },
      { id: 'acceptance', state: 'pending' },
    ]);
  });

  it('follows a running implementation and the checks of its pull request', () => {
    // arrange
    const pullRequest = {
      number: 7,
      externalUrl: 'https://example.test/pr/7',
      repositoryBindingId: 'repo',
      sourceBranch: 'feature',
      state: 'open',
    } as IPullRequestSummary;
    const run = {
      id: 'run',
      repositoryBindingId: 'repo',
      branch: 'feature',
      status: 'failed',
      startedAt: '2026-10-30T09:00:00.000Z',
    } as ICiRun;

    // act
    const steps = projectInboxSteps(
      input({
        entry: { ...entry('execution', item('progress')), group: 'update' },
        executions: [
          analysis,
          {
            ...analysis,
            id: 'solution',
            kind: 'solution',
            state: 'running',
            startedAt: '2026-10-30T08:00:00.000Z',
            finishedAt: undefined,
            pullRequest: { number: 7, externalUrl: pullRequest.externalUrl, branchUrl: '' },
          },
        ],
        pullRequests: [pullRequest],
        ciRuns: [run],
      }),
    );

    // assert
    expect(steps.map((step) => [step.id, step.state])).toEqual([
      ['analysis', 'done'],
      ['solution', 'done'],
      ['implementation', 'active'],
      ['checks', 'attention'],
      ['acceptance', 'pending'],
    ]);
  });

  it('counts the checks as passed once the item waits at the acceptance gate', () => {
    // arrange
    const projection = input({ entry: entry('acceptance', item('acceptance')), executions: [] });

    // act
    const steps = projectInboxSteps(projection);

    // assert
    expect(steps.map((step) => step.state)).toEqual(['done', 'done', 'done', 'done', 'attention']);
  });

  it('has no stages for an entry without a work item', () => {
    // arrange
    const projection = input({ entry: entry('failing-workflow') });

    // act
    const steps = projectInboxSteps(projection);

    // assert
    expect(steps).toEqual([]);
  });
});
