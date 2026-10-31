// #region Imports

import { describe, expect, it } from 'vitest';
import { resolvePullRequestMergeState } from './resolvePullRequestMergeState';

// #endregion

describe('resolvePullRequestMergeState', () => {
  it.each([
    [{ state: 'open', draft: true, baseBranchStatus: 'conflicting' }, 'passed', 'draft'],
    [{ state: 'open', draft: false, baseBranchStatus: 'conflicting' }, 'passed', 'conflict'],
    [{ state: 'open', draft: false, baseBranchStatus: 'behind' }, 'passed', 'behind'],
    [{ state: 'open', draft: false, baseBranchStatus: 'current' }, 'passed', 'ready'],
    [{ state: 'open', draft: false, baseBranchStatus: 'current' }, 'failing', 'mergeable'],
    [{ state: 'open', draft: false, baseBranchStatus: 'current' }, 'none', 'mergeable'],
    [{ state: 'open', draft: false, baseBranchStatus: 'unknown' }, 'passed', 'unknown'],
    [{ state: 'open', draft: false }, 'passed', 'unknown'],
    [{ state: 'merged', draft: false, baseBranchStatus: 'current' }, 'passed', 'merged'],
  ] as const)('resolves %j with %s checks to %s', (pullRequest, checks, expected) => {
    // arrange
    const input = { ...pullRequest };

    // act
    const state = resolvePullRequestMergeState(input, checks);

    // assert
    expect(state).toBe(expected);
  });
});
