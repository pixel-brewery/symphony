// #region Imports

import type { ICiRun, ILocalCiExecution } from '@symphony/domain-ci';
import { describe, expect, it } from 'vitest';
import { resolvePullRequestChecks } from './resolvePullRequestChecks';

// #endregion

describe('resolvePullRequestChecks', () => {
  const pullRequest = { repositoryBindingId: 'repository', sourceBranch: 'feature' };

  it('keeps the newest run of each workflow on the branch and lists failures first', () => {
    // arrange
    const runs = [
      run('lint-old', 'lint', 'failed', '2026-10-30T08:00:00.000Z'),
      run('lint-new', 'lint', 'succeeded', '2026-10-30T09:00:00.000Z'),
      run('unit', 'unit', 'failed', '2026-10-30T09:00:00.000Z'),
      run('codeql', 'CodeQL', 'in-progress', '2026-10-30T09:05:00.000Z'),
      { ...run('elsewhere', 'deploy', 'failed', '2026-10-30T09:00:00.000Z'), branch: 'main' },
      {
        ...run('other-repository', 'lint', 'failed', '2026-10-30T10:00:00.000Z'),
        repositoryBindingId: 'other',
      },
    ];

    // act
    const checks = resolvePullRequestChecks(pullRequest, runs, []);

    // assert
    expect(checks.map((check) => [check.run.id, check.state, check.source])).toEqual([
      ['unit', 'failed', 'cloud'],
      ['codeql', 'in-progress', 'cloud'],
      ['lint-new', 'succeeded', 'cloud'],
    ]);
  });

  it('reports the newer local-runner result and the run the local runner executes right now', () => {
    // arrange
    const runs = [
      run('lint', 'lint', 'failed', '2026-10-30T08:00:00.000Z'),
      run('unit', 'unit', 'succeeded', '2026-10-30T08:00:00.000Z'),
    ];
    const localExecutions: ILocalCiExecution[] = [
      {
        id: 'local-lint',
        workspaceId: 'workspace',
        repositoryBindingId: 'repository',
        ciRunId: 'lint',
        state: 'succeeded',
        startedAt: '2026-10-30T08:30:00.000Z',
        finishedAt: '2026-10-30T08:31:00.000Z',
      },
    ];

    // act
    const checks = resolvePullRequestChecks(pullRequest, runs, localExecutions, {
      runId: 'unit',
      startedAt: '2026-10-30T09:00:00.000Z',
    });

    // assert
    expect(checks.map((check) => [check.run.id, check.state, check.source])).toEqual([
      ['unit', 'in-progress', 'local'],
      ['lint', 'succeeded', 'local'],
    ]);
    expect(checks[1]?.finishedAt).toBe('2026-10-30T08:31:00.000Z');
  });

  it('has no checks while no workflow ran on the branch', () => {
    // arrange
    const runs = [{ ...run('main', 'lint', 'failed', '2026-10-30T08:00:00.000Z'), branch: 'main' }];

    // act
    const checks = resolvePullRequestChecks(pullRequest, runs, []);

    // assert
    expect(checks).toEqual([]);
  });
});

function run(id: string, workflow: string, status: ICiRun['status'], startedAt: string): ICiRun {
  return {
    id,
    workspaceId: 'workspace',
    ciBindingId: 'ci',
    repositoryBindingId: 'repository',
    workflowId: workflow,
    name: workflow,
    status,
    branch: 'feature',
    startedAt,
    ...(status === 'queued' || status === 'in-progress'
      ? {}
      : { finishedAt: new Date(Date.parse(startedAt) + 42_000).toISOString() }),
  };
}
