// #region Imports

import type { ICiRun } from '@symphony/domain-ci';
import type { IPullRequestSummary } from '@symphony/domain-delivery';
import type { IGoalVerificationReport } from '@symphony/domain-execution';
import { describe, expect, it } from 'vitest';
import { resolveWorkItemChecks } from './resolveWorkItemChecks';

// #endregion

const pullRequest: IPullRequestSummary = {
  id: 'pull-request-714',
  workspaceId: 'personal',
  repositoryBindingId: 'repository-1',
  number: 714,
  title: 'CR-0602',
  state: 'open',
  draft: false,
  sourceBranch: 'claude/cr-0602',
  targetBranch: 'main',
  externalUrl: 'https://github.com/owner/repository/pull/714',
  createdAt: '2026-10-31T16:40:00.000Z',
  updatedAt: '2026-10-31T16:52:00.000Z',
};

function run(overrides: Partial<ICiRun>): ICiRun {
  return {
    id: 'run-1',
    workspaceId: 'personal',
    ciBindingId: 'ci-1',
    repositoryBindingId: 'repository-1',
    name: 'PR Quality',
    status: 'succeeded',
    branch: 'claude/cr-0602',
    startedAt: '2026-10-31T16:52:00.000Z',
    ...overrides,
  };
}

describe('resolveWorkItemChecks', () => {
  it('keeps the newest run of every workflow on the pull-request branch, ordered by name', () => {
    // arrange
    const runs = [
      run({
        id: 'lint-old',
        workflowId: 'lint',
        name: 'Lint',
        status: 'failed',
        startedAt: '2026-10-31T15:00:00.000Z',
      }),
      run({ id: 'lint-new', workflowId: 'lint', name: 'Lint', status: 'succeeded' }),
      run({ id: 'codeql', workflowId: 'codeql', name: 'CodeQL', status: 'in-progress' }),
      run({ id: 'other-branch', workflowId: 'lint', name: 'Lint', branch: 'main' }),
      run({
        id: 'other-repository',
        workflowId: 'unit',
        name: 'Unit',
        repositoryBindingId: 'repository-2',
      }),
    ];

    // act
    const actual = resolveWorkItemChecks(pullRequest, undefined, runs, undefined);

    // assert
    expect(actual.map((check) => [check.id, check.status])).toEqual([
      ['codeql', 'in-progress'],
      ['lint-new', 'succeeded'],
    ]);
    expect(actual[0]).toMatchObject({ source: 'workflow', runId: 'codeql', name: 'CodeQL' });
  });

  it('falls back to the verification checks while no workflow ran on the branch', () => {
    // arrange
    const report: IGoalVerificationReport = {
      id: 'report-1',
      executionId: 'execution-1',
      recordedAt: '2026-10-31T17:00:00.000Z',
      state: 'failed',
      changedFiles: [],
      diffLines: 0,
      checks: [
        { label: 'Unit tests', state: 'passed' },
        { label: 'Lint', state: 'failed' },
      ],
    };

    // act
    const actual = resolveWorkItemChecks(undefined, 'codex/work-1', [], report);

    // assert
    expect(actual).toEqual([
      expect.objectContaining({ name: 'Unit tests', status: 'succeeded', source: 'verification' }),
      expect.objectContaining({ name: 'Lint', status: 'failed', source: 'verification' }),
    ]);
  });

  it('has no checks without a branch, a pull request or a report', () => {
    // act
    const actual = resolveWorkItemChecks(undefined, undefined, [run({})], undefined);

    // assert
    expect(actual).toEqual([]);
  });
});
