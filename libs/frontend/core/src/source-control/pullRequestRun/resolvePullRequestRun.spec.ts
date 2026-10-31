// #region Imports

import { describe, expect, it } from 'vitest';
import type { ICiRun } from '@symphony/domain-ci';
import type { IPullRequestSummary } from '@symphony/domain-delivery';
import { resolvePullRequestRun } from './';

// #endregion

describe('resolvePullRequestRun', () => {
  it('selects the latest run for the same repository and source branch', () => {
    // arrange
    const pullRequest = pullRequestSummary();
    const older = ciRun({ id: 'run-older', startedAt: '2026-08-14T10:00:00Z' });
    const latest = ciRun({ id: 'run-latest', startedAt: '2026-08-14T12:00:00Z' });

    // act
    const actual = resolvePullRequestRun(pullRequest, [
      latest,
      ciRun({ id: 'other-branch', branch: 'feature/other' }),
      ciRun({ id: 'other-repository', repositoryBindingId: 'repository-2' }),
      older,
    ]);

    // assert
    expect(actual).toEqual(latest);
  });
});

function pullRequestSummary(): IPullRequestSummary {
  return {
    id: 'repository-1:203',
    workspaceId: 'workspace-1',
    repositoryBindingId: 'repository-1',
    number: 203,
    title: 'Restore user invitation save action',
    state: 'open',
    draft: false,
    author: 'example',
    sourceBranch: 'feature/invitation',
    targetBranch: 'main',
    externalUrl: 'https://github.com/example/platform/pull/203',
    createdAt: '2026-08-14T09:00:00Z',
    updatedAt: '2026-08-14T12:00:00Z',
  };
}

function ciRun(overrides: Partial<ICiRun>): ICiRun {
  return {
    id: 'run-1',
    workspaceId: 'workspace-1',
    ciBindingId: 'ci-1',
    repositoryBindingId: 'repository-1',
    name: 'Verification',
    status: 'failed',
    branch: 'feature/invitation',
    startedAt: '2026-08-14T11:00:00Z',
    ...overrides,
  };
}
