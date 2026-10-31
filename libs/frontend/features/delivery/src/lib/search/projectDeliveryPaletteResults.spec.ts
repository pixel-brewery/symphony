// @vitest-environment jsdom

// #region Imports

import type { ICiRun } from '@symphony/domain-ci';
import type { IPullRequestSummary } from '@symphony/domain-delivery';
import { describe, expect, it, vi } from 'vitest';
import { projectDeliveryPaletteResults } from './projectDeliveryPaletteResults';

// #endregion

describe('projectDeliveryPaletteResults', () => {
  it('lists matching pull requests, open first, with their state and failing checks', () => {
    // arrange
    const pullRequests = [
      pullRequest(698, 'Restore drill notes', 'merged', 'drill'),
      pullRequest(712, 'Restore test runbook for Azure SQL', 'open', 'restore-runbook'),
      pullRequest(720, 'Unrelated', 'open', 'other'),
    ];
    const runs = [
      run('a1', 'build', 'restore-runbook', 'succeeded', '2026-10-31T07:00:00Z'),
      run('a2', 'build', 'restore-runbook', 'failed', '2026-10-31T08:00:00Z'),
      run('b1', 'lint', 'restore-runbook', 'failed', '2026-10-31T08:00:00Z'),
      run('c1', 'e2e', 'other-branch', 'failed', '2026-10-31T08:00:00Z'),
    ];

    // act
    const results = projectDeliveryPaletteResults(pullRequests, runs, 'restore');

    // assert
    expect(results.map((result) => [result.reference, result.title, result.facts])).toEqual([
      ['#712', 'Restore test runbook for Azure SQL', ['Open', '2 checks failing']],
      ['#698', 'Restore drill notes', ['Merged']],
    ]);
    expect(results[0]).toMatchObject({
      id: 'pull-request:pr-712',
      group: 'pull-requests',
      icon: 'branch',
      action: { kind: 'navigate', path: '/main/pull-requests', queryParams: { q: '712' } },
    });
  });

  it.each([
    [[['x', 'build', 'b', 'failed']], ['Open', '1 check failing']],
    [[['x', 'build', 'b', 'in-progress']], ['Open', 'checks running']],
    [[['x', 'build', 'b', 'succeeded']], ['Open', 'checks passing']],
    [[], ['Open']],
  ] as const)('summarises checks %j as %j', (runs, facts) => {
    // arrange
    const ciRuns = runs.map(([id, workflow, branch, status]) =>
      run(id, workflow, branch, status, '2026-10-31T08:00:00Z'),
    );

    // act
    const [result] = projectDeliveryPaletteResults(
      [pullRequest(5, 'Checks', 'open', 'b')],
      ciRuns,
      '#5',
    );

    // assert
    expect(result?.facts).toEqual(facts);
  });

  it('offers Sync now, which refreshes through the given sync', async () => {
    // arrange
    const sync = vi.fn(async () => undefined);

    // act
    const opening = projectDeliveryPaletteResults([], [], '', sync);
    const typed = projectDeliveryPaletteResults([], [], 'refresh', sync);
    const unavailable = projectDeliveryPaletteResults([], [], '');
    const action = opening[0]?.action;
    if (action?.kind === 'execute') await action.execute();

    // assert
    expect(opening.map((result) => [result.id, result.title, result.icon])).toEqual([
      ['command:sync-now', 'Sync now', 'sync'],
    ]);
    expect(typed.map((result) => result.id)).toEqual(['command:sync-now']);
    expect(unavailable).toEqual([]);
    expect(sync).toHaveBeenCalledOnce();
  });
});

function pullRequest(
  number: number,
  title: string,
  state: IPullRequestSummary['state'],
  sourceBranch: string,
): IPullRequestSummary {
  return {
    id: `pr-${number}`,
    workspaceId: 'workspace',
    repositoryBindingId: 'repository',
    number,
    title,
    state,
    draft: false,
    sourceBranch,
    targetBranch: 'main',
    externalUrl: `https://example.test/pull/${number}`,
    createdAt: '2026-10-01T08:00:00Z',
    updatedAt: '2026-10-01T09:00:00Z',
  };
}

function run(
  id: string,
  workflowId: string,
  branch: string,
  status: ICiRun['status'],
  startedAt: string,
): ICiRun {
  return {
    id,
    workspaceId: 'workspace',
    ciBindingId: 'ci',
    repositoryBindingId: 'repository',
    workflowId,
    name: workflowId,
    branch,
    status,
    startedAt,
  };
}
