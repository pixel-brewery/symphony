// #region Imports

import type { IExecutionRecord } from '@symphony/domain-execution';
import type { IPullRequestSummary } from '@symphony/domain-delivery';
import { describe, expect, it } from 'vitest';
import { resolveBoardPullRequest } from './';

// #endregion

const pullRequestUrl = 'https://github.com/owner/repository/pull/211';

const summary: IPullRequestSummary = {
  id: 'pull-request-211',
  workspaceId: 'personal',
  repositoryBindingId: 'repository-1',
  number: 211,
  title: 'CR-0098',
  state: 'open',
  draft: false,
  sourceBranch: 'codex/work-146',
  targetBranch: 'dev',
  externalUrl: pullRequestUrl,
  createdAt: '2026-08-21T06:19:00.000Z',
  updatedAt: '2026-08-21T06:19:00.000Z',
};

function execution(overrides: Partial<IExecutionRecord> = {}): IExecutionRecord {
  return {
    id: 'execution-1',
    workItemId: 'work-1',
    workflowId: 'workflow',
    kind: 'solution',
    state: 'succeeded',
    startedAt: '2026-08-21T06:00:00.000Z',
    pullRequest: { number: 211, externalUrl: pullRequestUrl, branchUrl: `${pullRequestUrl}/files` },
    ...overrides,
  };
}

describe('resolveBoardPullRequest', () => {
  it('takes the pull request of the newest delivering execution', () => {
    // arrange
    const executions = [
      execution({ id: 'older', startedAt: '2026-08-20T06:00:00.000Z' }),
      execution({ id: 'newest', kind: 'revision' }),
    ];

    // act
    const context = resolveBoardPullRequest(executions, [summary]);

    // assert
    expect(context?.reference.number).toBe(211);
    expect(context?.summary?.id).toBe('pull-request-211');
  });

  it('reports nothing for an item that was never delivered', () => {
    // act
    const actual = resolveBoardPullRequest([execution({ pullRequest: undefined })], [summary]);

    // assert
    expect(actual).toBeUndefined();
  });

  it('keeps the delivered reference when the pull-request projection is not loaded', () => {
    // act
    const context = resolveBoardPullRequest([execution()], []);

    // assert
    expect(context?.reference.number).toBe(211);
    expect(context?.summary).toBeUndefined();
  });
});
