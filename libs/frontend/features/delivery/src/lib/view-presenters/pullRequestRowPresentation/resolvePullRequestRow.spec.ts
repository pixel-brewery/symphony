// #region Imports

import type { ICiRun } from '@symphony/domain-ci';
import type { IPullRequestSummary } from '@symphony/domain-delivery';
import { describe, expect, it } from 'vitest';
import { resolvePullRequestRow } from './resolvePullRequestRow';

// #endregion

describe('resolvePullRequestRow', () => {
  it.each([
    ['failing checks', 'failed', 'current', true],
    ['a conflict', 'succeeded', 'conflicting', true],
    ['a branch behind its base', 'succeeded', 'behind', true],
    ['passing checks on a current branch', 'succeeded', 'current', false],
  ] as const)('marks a pull request with %s', (_case, checkState, baseBranchStatus, expected) => {
    // arrange
    const pullRequest = { state: 'open', draft: false, baseBranchStatus } as IPullRequestSummary;
    const checks = [
      { run: { name: 'lint' } as ICiRun, source: 'cloud', state: checkState } as const,
    ];

    // act
    const row = resolvePullRequestRow(pullRequest, checks, { active: false });

    // assert
    expect(row.needsAction).toBe(expected);
    expect(row.checksSummary.total).toBe(1);
  });
});
