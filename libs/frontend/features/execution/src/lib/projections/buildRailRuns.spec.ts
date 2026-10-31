// #region Imports

import { describe, expect, it } from 'vitest';
import { buildRailRuns } from './buildRailRuns';

// #endregion

describe('buildRailRuns', () => {
  it('uses the durable work-item snapshot and does not present paused work as active', () => {
    // arrange
    const runs = buildRailRuns({
      executions: [
        {
          id: 'agent-paused',
          workItemId: 'ticket-paused',
          workflowId: 'delivery',
          kind: 'solution',
          state: 'waiting',
          startedAt: '2026-08-15T09:00:00.000Z',
          pause: {
            reason: 'operator',
            pausedAt: '2026-08-15T09:01:00.000Z',
          },
          workItemSnapshot: {
            id: 'ticket-paused',
            externalId: '#211',
            title: 'Keep the status surface compact',
            body: '',
            stageId: 'qualified',
            provider: 'simulated',
            repository: 'example/platform',
            labels: [],
            assignees: [],
            createdAt: '2026-08-15T08:00:00.000Z',
            updatedAt: '2026-08-15T09:00:00.000Z',
          },
        },
      ],
      executionQueue: [],
      events: [],
      workItems: [],
      ciRuns: [],
      localCiExecutions: [],
      repositoryNames: {},
    });

    // act
    const [paused] = runs;

    // assert
    expect(paused).toMatchObject({
      title: '#211 · Implementation',
      state: 'paused',
      statusLabel: 'Paused',
      active: false,
    });
  });

  it('keeps waiting steps on top in the order they will run and offers withdrawal', () => {
    // arrange
    const runs = buildRailRuns({
      executions: [
        {
          id: 'agent-1',
          workItemId: 'ticket-9',
          workflowId: 'delivery',
          kind: 'analysis',
          state: 'running',
          startedAt: '2026-08-15T09:00:00.000Z',
        },
      ],
      executionQueue: [
        {
          id: 'queue-1',
          workItemId: 'ticket-1',
          workItemExternalId: '#203',
          workItemTitle: 'Restore invitation',
          kind: 'analysis',
          origin: 'operator',
          queuedAt: '2026-08-15T08:10:00.000Z',
        },
        {
          id: 'queue-2',
          workItemId: 'ticket-2',
          workItemExternalId: '#204',
          workItemTitle: 'Repair formatting',
          kind: 'solution',
          origin: 'operator',
          queuedAt: '2026-08-15T08:20:00.000Z',
        },
      ],
      events: [],
      workItems: [],
      ciRuns: [],
      localCiExecutions: [],
      repositoryNames: {},
    });

    // act
    const actual = runs.map((run) => run.id);

    // assert
    expect(actual).toEqual(['queued:ticket-1', 'queued:ticket-2', 'agent-1']);
    expect(runs[0]).toMatchObject({
      kind: 'agent',
      title: '#203 · Analysis',
      state: 'queued',
      statusLabel: 'Queued',
      active: false,
      queueEntryId: 'queue-1',
    });
    expect(runs[0]?.message).toBe('Position 1 of 2');
    expect(runs[1]?.title).toBe('#204 · Implementation');
    // A waiting step has no run behind it, so nothing addresses it as an execution.
    expect(runs[0]?.executionId).toBeUndefined();
  });

  it('groups one GitHub Action with its local execution while keeping agent runs separate', () => {
    // arrange
    const runs = buildRailRuns({
      executions: [
        {
          id: 'agent-1',
          workItemId: 'ticket-1',
          workflowId: 'delivery',
          kind: 'solution',
          state: 'succeeded',
          startedAt: '2026-08-15T08:00:00.000Z',
          finishedAt: '2026-08-15T08:05:00.000Z',
        },
      ],
      executionQueue: [],
      events: [],
      workItems: [
        {
          id: 'ticket-1',
          externalId: '#203',
          title: 'Restore invitation',
          body: '',
          stageId: 'qualified',
          provider: 'simulated',
          repository: 'example/platform',
          labels: [],
          assignees: [],
          createdAt: '2026-08-15T07:00:00.000Z',
          updatedAt: '2026-08-15T08:05:00.000Z',
        },
      ],
      ciRuns: [
        {
          id: 'ci-1',
          workspaceId: 'workspace-1',
          ciBindingId: 'binding-1',
          repositoryBindingId: 'repository-1',
          name: 'Checklist',
          status: 'in-progress',
          branch: 'dev',
          startedAt: '2026-08-15T10:00:00.000Z',
          externalUrl: 'https://github.com/example/platform/actions/runs/1',
        },
      ],
      localCiExecutions: [
        {
          id: 'local-1',
          workspaceId: 'workspace-1',
          repositoryBindingId: 'repository-1',
          ciRunId: 'ci-1',
          state: 'succeeded',
          startedAt: '2026-08-15T09:00:00.000Z',
          finishedAt: '2026-08-15T09:10:00.000Z',
          failureLog: 'Exact output from this local execution',
          localDiagnostics: '4 CPUs · 8 GB memory · 24 GB disk · 4 GB cache',
          runner: {
            kind: 'managed-linux-vm',
            os: 'linux',
            architecture: 'arm64',
            label: 'runner-1',
            imageVersion: 'ubuntu-24.04',
          },
        },
      ],
      repositoryNames: { 'repository-1': 'platform' },
    });

    // act
    const actual = runs.map((run) => [run.kind, run.sourceLabel, run.statusLabel]);

    // assert
    expect(actual).toEqual([
      ['local-action', 'Action', 'Succeeded'],
      ['agent', 'Agent', 'Succeeded'],
    ]);
    expect(runs[0]?.message).toBe('platform · dev');
    expect(runs[0]?.sources).toEqual([
      { kind: 'github', label: 'GitHub', state: 'in-progress' },
      { kind: 'local-runner', label: 'Local runner', state: 'succeeded' },
    ]);
    expect(runs[0]?.failureLog).toBe('Exact output from this local execution');
    expect(runs[0]?.localDiagnostics).toBe('4 CPUs · 8 GB memory · 24 GB disk · 4 GB cache');
    expect(runs[1]?.title).toBe('#203 · Implementation');
  });

  it('projects an active local run independently from its cloud workflow state', () => {
    // arrange
    const runs = buildRailRuns({
      executions: [],
      executionQueue: [],
      events: [],
      workItems: [],
      ciRuns: [
        {
          id: 'ci-1',
          workspaceId: 'workspace-1',
          ciBindingId: 'binding-1',
          repositoryBindingId: 'repository-1',
          name: 'Checklist',
          status: 'failed',
        },
      ],
      localCiExecutions: [],
      repositoryNames: { 'repository-1': 'platform' },
      activeLocalCiRun: { runId: 'ci-1', startedAt: '2026-08-15T11:00:00.000Z' },
    });

    // act
    const actual = runs.map((run) => [run.kind, run.statusLabel, run.active]);

    // assert
    expect(actual).toEqual([['local-action', 'In progress', true]]);
    expect(runs[0]?.sources).toEqual([
      { kind: 'github', label: 'GitHub', state: 'failed' },
      { kind: 'local-runner', label: 'Local runner', state: 'in-progress' },
    ]);
  });

  it('keeps queued runs static until execution starts', () => {
    // arrange
    const runs = buildRailRuns({
      executions: [
        {
          id: 'agent-1',
          workItemId: 'ticket-1',
          workflowId: 'delivery',
          kind: 'solution',
          state: 'queued',
          startedAt: '2026-08-15T11:00:00.000Z',
        },
      ],
      executionQueue: [],
      events: [],
      workItems: [],
      ciRuns: [
        {
          id: 'ci-1',
          workspaceId: 'workspace-1',
          ciBindingId: 'binding-1',
          repositoryBindingId: 'repository-1',
          name: 'Checklist',
          status: 'queued',
          startedAt: '2026-08-15T12:00:00.000Z',
        },
      ],
      localCiExecutions: [],
      repositoryNames: { 'repository-1': 'platform' },
    });

    // act
    const actual = runs.map((run) => [run.kind, run.statusLabel, run.active]);

    // assert
    expect(actual).toEqual([
      ['cloud-action', 'Queued', false],
      ['agent', 'Queued', false],
    ]);
    expect(runs[0]?.sources).toEqual([{ kind: 'github', label: 'GitHub', state: 'queued' }]);
  });

  it('does not group a current GitHub rerun with local evidence from an earlier attempt', () => {
    // arrange
    const runs = buildRailRuns({
      executions: [],
      executionQueue: [],
      events: [],
      workItems: [],
      ciRuns: [
        {
          id: 'ci-1',
          workspaceId: 'workspace-1',
          ciBindingId: 'binding-1',
          repositoryBindingId: 'repository-1',
          name: 'Deploy Dev',
          status: 'queued',
          runAttempt: 2,
          startedAt: '2026-08-15T12:00:00.000Z',
        },
      ],
      localCiExecutions: [
        {
          id: 'local-1',
          workspaceId: 'workspace-1',
          repositoryBindingId: 'repository-1',
          ciRunId: 'ci-1',
          runAttempt: 1,
          state: 'failed',
          startedAt: '2026-08-15T11:00:00.000Z',
          finishedAt: '2026-08-15T11:05:00.000Z',
        },
      ],
      repositoryNames: { 'repository-1': 'platform' },
    });

    // act
    const actual = runs.map((run) => [run.kind, run.runAttempt, run.sources]);

    // assert
    expect(actual).toEqual([
      ['cloud-action', 2, [{ kind: 'github', label: 'GitHub', state: 'queued' }]],
    ]);
  });
});
