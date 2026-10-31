// #region Imports

import type { ICiRun } from '@symphony/domain-ci';
import type { IPullRequestSummary } from '@symphony/domain-delivery';
import type {
  IDeliveryGroupProposal,
  IExecutionRecord,
  IGoalRecord,
} from '@symphony/domain-execution';
import type { IAgentProfile, IAgentTeam } from '@symphony/domain-team';
import type { IWorkItem } from '@symphony/domain-work';
import { defaultWorkflow } from '@symphony/domain-workflow';
import { describe, expect, it } from 'vitest';
import type { IInboxProjectionInput } from './IInboxProjectionInput';
import { projectInboxEntries } from './projectInboxEntries';

// #endregion

const NOW = Date.parse('2026-10-30T12:00:00.000Z');

function item(id: string, stageId: string, overrides: Partial<IWorkItem> = {}): IWorkItem {
  return {
    id,
    workspaceId: 'workspace',
    externalId: `CR-${id}`,
    title: `Title ${id}`,
    body: '',
    stageId,
    boardColumnId: stageId,
    provider: 'simulated',
    repository: 'owner/repo',
    labels: [],
    assignees: [],
    ...overrides,
  };
}

function execution(
  id: string,
  workItemId: string,
  overrides: Partial<IExecutionRecord> = {},
): IExecutionRecord {
  return {
    id,
    workItemId,
    workflowId: 'workflow',
    kind: 'analysis',
    mode: 'ai',
    state: 'succeeded',
    startedAt: '2026-10-30T10:00:00.000Z',
    finishedAt: '2026-10-30T11:00:00.000Z',
    summary: '## Analysis complete\n\nRestore the **database** into an isolated target.',
    bindingSnapshot: { agentProfileId: 'codex' } as IExecutionRecord['bindingSnapshot'],
    ...overrides,
  };
}

function run(id: string, overrides: Partial<ICiRun> = {}): ICiRun {
  return {
    id,
    workspaceId: 'workspace',
    ciBindingId: 'ci',
    repositoryBindingId: 'repo',
    workflowId: 'deploy',
    name: 'Deploy Dev',
    status: 'failed',
    branch: 'main',
    revision: 'e81f3b2aa',
    startedAt: '2026-10-30T09:00:00.000Z',
    finishedAt: '2026-10-30T09:10:00.000Z',
    ...overrides,
  };
}

const agents: readonly IAgentProfile[] = [
  { id: 'codex', workspaceId: 'workspace', displayName: 'Codex', enabled: true } as IAgentProfile,
  {
    id: 'claude',
    workspaceId: 'workspace',
    displayName: 'Claude Code',
    enabled: true,
  } as IAgentProfile,
  { id: 'off', workspaceId: 'workspace', displayName: 'Off', enabled: false } as IAgentProfile,
];

function input(overrides: Partial<IInboxProjectionInput> = {}): IInboxProjectionInput {
  return {
    workItems: [],
    boardColumns: defaultWorkflow.stages.map((stage) => ({
      id: stage.id,
      label: stage.label,
      stageId: stage.id,
    })),
    executions: [],
    executionQueue: [],
    stages: defaultWorkflow.stages,
    readiness: [],
    goals: [],
    deliveryGroupProposals: [],
    pullRequests: [],
    ciRuns: [],
    agents,
    teams: [],
    now: NOW,
    snoozedUntil: new Map(),
    ...overrides,
  };
}

describe('projectInboxEntries', () => {
  it('asks how an analysed item continues, with the analysis findings and open questions', () => {
    // arrange
    const projection = input({
      workItems: [item('589', 'ready')],
      executions: [execution('analysis', '589')],
      readiness: [
        {
          workItemId: '589',
          analysisStored: true,
          readyForSolve: true,
          openDecisions: ['Which backup point should be used?'],
          hardDependencyIds: [],
          running: false,
        },
      ],
    });

    // act
    const [entry] = projectInboxEntries(projection);

    // assert
    expect(entry).toMatchObject({
      id: 'solution:589',
      group: 'decision',
      kind: 'solution',
      at: '2026-10-30T11:00:00.000Z',
      agentName: 'Codex',
      columnLabel: 'Ready',
      findings: [
        { tone: 'info', text: 'Restore the database into an isolated target.' },
        { tone: 'open', text: 'Which backup point should be used?' },
      ],
    });
    expect(entry?.options.map((option) => option.id)).toEqual([
      'assign-codex',
      'assign-claude',
      'record-solution',
    ]);
  });

  it('offers the agents a team assigns to the implementation, primary first', () => {
    // arrange
    const teams: readonly IAgentTeam[] = [
      {
        id: 'team',
        workspaceId: 'workspace',
        displayName: 'Team',
        description: '',
        assignments: [
          {
            role: 'solution',
            primaryAgentId: 'claude',
            fallbackAgentIds: ['codex'],
            skillId: null,
          },
        ],
      },
    ];

    // act
    const [entry] = projectInboxEntries(
      input({
        workItems: [item('589', 'ready')],
        executions: [execution('analysis', '589')],
        teams,
      }),
    );

    // assert
    expect(entry?.options.slice(0, 2)).toEqual([
      {
        id: 'assign-claude',
        kind: 'assign',
        agentId: 'claude',
        agentName: 'Claude Code',
        teamId: 'team',
      },
      { id: 'assign-codex', kind: 'assign', agentId: 'codex', agentName: 'Codex', teamId: 'team' },
    ]);
  });

  it('raises no solution decision while a step runs, waits in the queue or already implemented', () => {
    // arrange
    const running = input({
      workItems: [item('1', 'ready'), item('2', 'ready'), item('3', 'ready')],
      executions: [
        execution('analysis-1', '1'),
        execution('solution-1', '1', {
          kind: 'solution',
          state: 'running',
          startedAt: '2026-10-30T11:30:00.000Z',
        }),
        execution('analysis-2', '2'),
        execution('analysis-3', '3'),
        execution('solution-3', '3', {
          kind: 'solution',
          state: 'failed',
          startedAt: '2026-10-30T11:30:00.000Z',
        }),
      ],
      executionQueue: [
        {
          id: 'queued',
          workItemId: '2',
          workItemExternalId: 'CR-2',
          workItemTitle: 'Title 2',
          kind: 'solution',
          origin: 'operator',
        } as IInboxProjectionInput['executionQueue'][number],
      ],
    });

    // act
    const entries = projectInboxEntries(running);

    // assert
    expect(entries.filter((entry) => entry.group === 'decision')).toEqual([]);
  });

  it('asks to review delivered work at the acceptance gate with its decisions', () => {
    // arrange
    const projection = input({
      workItems: [item('571', 'acceptance', { updatedAt: '2026-10-30T11:12:00.000Z' })],
      executions: [
        execution('solution', '571', {
          kind: 'solution',
          finishedAt: '2026-10-30T11:10:00.000Z',
          summary: 'Validated the XRechnung export.',
          pullRequest: { number: 693, externalUrl: 'https://example.test/pr/693', branchUrl: '' },
        }),
      ],
    });

    // act
    const [entry] = projectInboxEntries(projection);

    // assert
    expect(entry).toMatchObject({
      kind: 'acceptance',
      at: '2026-10-30T11:12:00.000Z',
      pullRequestNumber: 693,
      findings: [{ tone: 'info', text: 'Validated the XRechnung export.' }],
    });
    expect(entry?.options[0]).toMatchObject({
      kind: 'decide',
      optionId: 'accept',
      effect: 'advance',
    });
  });

  it('reviews a delegated goal instead of the gate decisions', () => {
    // arrange
    const goal = {
      workItemId: '571',
      state: 'reviewing',
      updatedAt: '2026-10-30T11:20:00.000Z',
    } as IGoalRecord;

    // act
    const [entry] = projectInboxEntries(
      input({ workItems: [item('571', 'progress')], goals: [goal] }),
    );

    // assert
    expect(entry?.kind).toBe('acceptance');
    expect(entry?.options).toEqual([
      { id: 'review-approved', kind: 'review-goal', decision: 'approved' },
      { id: 'review-revision', kind: 'review-goal', decision: 'revision-required' },
    ]);
  });

  it('asks about open delivery-group proposals of items in scope only', () => {
    // arrange
    const proposal = {
      id: 'proposal',
      workspaceId: 'workspace',
      rootWorkItemId: '1',
      workItemIds: ['1', '2'],
      assessment: { evidence: ['Both change the export module.'] },
      state: 'open',
      createdAt: '2026-10-30T08:00:00.000Z',
    } as unknown as IDeliveryGroupProposal;

    // act
    const entries = projectInboxEntries(
      input({
        workItems: [item('1', 'backlog')],
        deliveryGroupProposals: [
          proposal,
          { ...proposal, id: 'foreign', rootWorkItemId: 'elsewhere' },
          { ...proposal, id: 'done', state: 'confirmed' },
        ],
      }),
    );

    // assert
    expect(entries).toEqual([
      expect.objectContaining({
        id: 'delivery-group:proposal',
        kind: 'delivery-group',
        workItemCount: 2,
        findings: [{ tone: 'info', text: 'Both change the export module.' }],
        options: [
          { id: 'confirm-group', kind: 'confirm-group', proposalId: 'proposal' },
          { id: 'reject-group', kind: 'reject-group', proposalId: 'proposal' },
        ],
      }),
    ]);
  });

  it('raises one decision per workflow whose newest finished run failed, with its streak', () => {
    // arrange
    const runs = [
      run('newest', { finishedAt: '2026-10-30T09:10:00.000Z' }),
      run('older', {
        finishedAt: '2026-10-30T08:10:00.000Z',
        startedAt: '2026-10-30T08:00:00.000Z',
      }),
      run('oldest', { status: 'succeeded', finishedAt: '2026-10-30T07:10:00.000Z' }),
      run('running', {
        status: 'in-progress',
        finishedAt: undefined,
        startedAt: '2026-10-30T11:00:00.000Z',
      }),
      run('green', { workflowId: 'quality', name: 'PR Quality', status: 'succeeded' }),
    ];

    // act
    const entries = projectInboxEntries(input({ ciRuns: runs }));

    // assert
    expect(entries).toEqual([
      expect.objectContaining({
        kind: 'failing-workflow',
        workflowName: 'Deploy Dev',
        failureStreak: 2,
        branch: 'main',
        revision: 'e81f3b2aa',
        options: [
          { id: 'rerun', kind: 'rerun', runId: 'newest' },
          { id: 'open-actions', kind: 'open-actions', workflowName: 'Deploy Dev' },
        ],
      }),
    ]);
  });

  it('reports recent agent steps and merged pull requests as updates, newest first', () => {
    // arrange
    const pullRequest: IPullRequestSummary = {
      id: 'pr-705',
      workspaceId: 'workspace',
      repositoryBindingId: 'repo',
      number: 705,
      title: 'Export as CSV',
      state: 'merged',
      draft: false,
      sourceBranch: 'feature',
      targetBranch: 'main',
      externalUrl: 'https://example.test/pr/705',
      createdAt: '2026-10-28T08:00:00.000Z',
      updatedAt: '2026-10-29T08:00:00.000Z',
    };

    // act
    const entries = projectInboxEntries(
      input({
        workItems: [item('602', 'progress'), item('583', 'done'), item('old', 'done')],
        executions: [
          execution('implementation', '602', {
            kind: 'solution',
            state: 'running',
            finishedAt: undefined,
            startedAt: '2026-10-30T10:30:00.000Z',
            bindingSnapshot: { agentProfileId: 'claude' } as IExecutionRecord['bindingSnapshot'],
          }),
          execution('solution-583', '583', {
            kind: 'solution',
            pullRequest: { number: 705, externalUrl: pullRequest.externalUrl, branchUrl: '' },
            startedAt: '2026-10-20T08:00:00.000Z',
            finishedAt: '2026-10-20T09:00:00.000Z',
          }),
          execution('ancient', 'old', {
            startedAt: '2026-09-01T08:00:00.000Z',
            finishedAt: '2026-09-01T09:00:00.000Z',
          }),
        ],
        pullRequests: [pullRequest],
      }),
    );

    // assert
    expect(entries.map((entry) => [entry.kind, entry.workItem?.id])).toEqual([
      ['execution', '602'],
      ['merged-pull-request', '583'],
    ]);
    expect(entries[0]).toMatchObject({
      group: 'update',
      agentName: 'Claude Code',
      executionKind: 'solution',
      executionState: 'running',
    });
  });

  it('leaves snoozed entries out until their time has passed', () => {
    // arrange
    const projection = input({
      workItems: [item('589', 'ready')],
      executions: [execution('analysis', '589')],
    });

    // act
    const snoozed = projectInboxEntries({
      ...projection,
      snoozedUntil: new Map([['solution:589', NOW + 1]]),
    });
    const woken = projectInboxEntries({
      ...projection,
      snoozedUntil: new Map([['solution:589', NOW]]),
    });

    // assert
    expect(snoozed.some((entry) => entry.id === 'solution:589')).toBe(false);
    expect(woken.some((entry) => entry.id === 'solution:589')).toBe(true);
  });
});
