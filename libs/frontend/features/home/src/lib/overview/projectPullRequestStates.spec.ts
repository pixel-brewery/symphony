// @vitest-environment jsdom

// #region Imports

import type { ICiRun } from '@symphony/domain-ci';
import type { IPullRequestSummary } from '@symphony/domain-delivery';
import { describe, expect, it } from 'vitest';
import { projectPullRequestStates } from './projectPullRequestStates';

// #endregion

function pullRequest(
  id: string,
  overrides: Partial<IPullRequestSummary> = {},
): IPullRequestSummary {
  return {
    id,
    workspaceId: 'workspace',
    repositoryBindingId: 'repo',
    number: Number(id),
    title: id,
    state: 'open',
    draft: false,
    sourceBranch: `branch-${id}`,
    targetBranch: 'main',
    externalUrl: `https://example.test/pr/${id}`,
    createdAt: '2026-10-30T08:00:00.000Z',
    updatedAt: '2026-10-30T08:00:00.000Z',
    ...overrides,
  };
}

function run(branch: string, status: ICiRun['status']): ICiRun {
  return {
    id: `${branch}-${status}`,
    workspaceId: 'workspace',
    ciBindingId: 'ci',
    repositoryBindingId: 'repo',
    name: 'PR Quality',
    status,
    branch,
    startedAt: '2026-10-30T09:00:00.000Z',
  };
}

describe('projectPullRequestStates', () => {
  it('counts open pull requests with the Pull requests rules for checks and readiness', () => {
    // arrange
    const pullRequests = [
      pullRequest('1'),
      pullRequest('2'),
      pullRequest('3', { draft: true }),
      pullRequest('4'),
      pullRequest('5', { state: 'merged' }),
      pullRequest('6', { baseBranchStatus: 'current' }),
      pullRequest('7', { baseBranchStatus: 'behind' }),
    ];
    const runs = [
      run('branch-1', 'failed'),
      { ...run('branch-1', 'succeeded'), workflowId: 'other', name: 'Deploy' },
      run('branch-2', 'in-progress'),
      run('branch-3', 'queued'),
      run('branch-5', 'failed'),
      run('branch-6', 'succeeded'),
      run('branch-7', 'succeeded'),
    ];

    // act
    const counts = projectPullRequestStates(pullRequests, runs, []);

    // assert
    expect(counts).toEqual({
      open: 6,
      checksFailing: 1,
      readyToMerge: 1,
      checksRunning: 2,
      drafts: 1,
    });
  });

  it('counts open pull requests that request a review from one of the signed-in logins', () => {
    // arrange
    const pullRequests = [
      pullRequest('1', { requestedReviewers: ['RueDeRennes'] }),
      pullRequest('2', { requestedReviewers: ['someone-else', 'ruederennes'] }),
      pullRequest('3', { requestedReviewers: ['someone-else'], requestedTeams: ['flamox/core'] }),
      pullRequest('4', { requestedReviewers: ['RueDeRennes'], state: 'closed' }),
      pullRequest('5'),
    ];

    // act
    const known = projectPullRequestStates(pullRequests, [], [], new Set(['ruederennes']));
    const unknown = projectPullRequestStates(pullRequests, [], []);

    // assert
    expect(known.waitingForReview).toBe(2);
    expect(unknown).not.toHaveProperty('waitingForReview');
  });
});
