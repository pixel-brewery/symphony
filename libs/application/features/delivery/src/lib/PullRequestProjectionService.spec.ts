// #region Imports

import { describe, expect, it, vi } from 'vitest';
import { RemoteProviderAuthenticationRequiredError } from '@symphony/application-core';
import type { IPullRequestProjection, IPullRequestSummary } from '@symphony/domain-delivery';
import { PullRequestProjectionService } from './PullRequestProjectionService';
import type { IPullRequestProjectionRepository } from './ports/IPullRequestProjectionRepository';

// #endregion

const pullRequest: IPullRequestSummary = {
  id: 'repository-1:17',
  workspaceId: 'workspace-1',
  repositoryBindingId: 'repository-1',
  number: 17,
  title: 'Implement the approved change',
  state: 'open',
  draft: true,
  sourceBranch: 'codex/approved-change',
  targetBranch: 'main',
  externalUrl: 'https://github.com/example/platform/pull/17',
  createdAt: '2026-08-19T08:00:00.000Z',
  updatedAt: '2026-08-19T09:00:00.000Z',
};

const cached: IPullRequestProjection = {
  version: 1,
  workspaceIds: ['workspace-1'],
  pullRequests: [pullRequest],
  refreshedAt: '2026-08-19T09:00:00.000Z',
};

describe('PullRequestProjectionService', () => {
  it('keeps the saved pull requests and safe recovery status when the provider needs authentication', async () => {
    // arrange
    const cause = new RemoteProviderAuthenticationRequiredError(
      'Provider-specific sign-in detail.',
    );
    const repository: IPullRequestProjectionRepository = {
      loadPullRequests: vi.fn(() => cached),
      savePullRequests: vi.fn(),
    };
    const reportReadFailure = vi.fn();
    const service = new PullRequestProjectionService({
      pullRequests: {
        listPullRequests: vi.fn(async () => {
          throw cause;
        }),
      },
      repository,
      clock: { now: () => '2026-08-19T10:00:00.000Z' },
      scope: () => ({ workspaceIds: ['workspace-1'], pullRequests: 'workspace-1' }),
      reportReadFailure,
    });

    // act
    const result = await service.loadProjection(true);

    // assert
    expect(result.projection).toEqual(cached);
    expect(result.status).toEqual({
      state: 'stale',
      reason: 'authentication-required',
      lastSuccessfulRefreshAt: cached.refreshedAt,
    });
    expect(JSON.stringify(result.status)).not.toContain('Provider-specific');
    expect(reportReadFailure).toHaveBeenCalledWith('pull-requests', cause, true);
    expect(repository.savePullRequests).not.toHaveBeenCalled();
  });

  it('shares an in-flight provider read between refreshes for the same repository scope', async () => {
    // arrange
    let finishRead!: () => void;
    const readReady = new Promise<void>((resolve) => {
      finishRead = resolve;
    });
    const listPullRequests = vi.fn(async () => {
      await readReady;
      return [pullRequest];
    });
    const repository: IPullRequestProjectionRepository = {
      loadPullRequests: vi.fn(() => undefined),
      savePullRequests: vi.fn(),
    };
    const service = new PullRequestProjectionService({
      pullRequests: { listPullRequests },
      repository,
      clock: { now: () => '2026-08-19T10:00:00.000Z' },
      scope: () => ({ workspaceIds: ['workspace-1'], pullRequests: 'workspace-1' }),
    });

    // act
    const first = service.loadProjection(true);
    const second = service.loadProjection(true);
    finishRead();
    const results = await Promise.all([first, second]);

    // assert
    expect(listPullRequests).toHaveBeenCalledOnce();
    expect(repository.savePullRequests).toHaveBeenCalledOnce();
    expect(results[0]).toEqual(results[1]);
    expect(results[1]?.projection.pullRequests).toEqual([pullRequest]);
  });

  it('refreshes the new scope after a superseded read without persisting data under the wrong scope', async () => {
    // arrange
    let activeScope = 'workspace-1';
    let finishFirstRead!: () => void;
    const firstReadReady = new Promise<void>((resolve) => {
      finishFirstRead = resolve;
    });
    const nextPullRequest: IPullRequestSummary = {
      ...pullRequest,
      id: 'repository-2:18',
      workspaceId: 'workspace-2',
      repositoryBindingId: 'repository-2',
      number: 18,
    };
    const listPullRequests = vi.fn(async () => {
      const requestedScope = activeScope;
      if (requestedScope === 'workspace-1') await firstReadReady;
      return requestedScope === 'workspace-1' ? [pullRequest] : [nextPullRequest];
    });
    const repository: IPullRequestProjectionRepository = {
      loadPullRequests: vi.fn(() => undefined),
      savePullRequests: vi.fn(),
    };
    const reportReadFailure = vi.fn();
    const service = new PullRequestProjectionService({
      pullRequests: { listPullRequests },
      repository,
      clock: { now: () => '2026-08-19T10:00:00.000Z' },
      scope: () => ({ workspaceIds: [activeScope], pullRequests: activeScope }),
      reportReadFailure,
    });

    // act
    const previous = service.loadProjection(true);
    activeScope = 'workspace-2';
    const current = service.loadProjection(true);
    finishFirstRead();
    const [previousResult, currentResult] = await Promise.all([previous, current]);

    // assert
    expect(previousResult.status).toEqual({ state: 'unavailable' });
    expect(currentResult.projection.pullRequests).toEqual([nextPullRequest]);
    expect(listPullRequests).toHaveBeenCalledTimes(2);
    expect(repository.savePullRequests).toHaveBeenCalledExactlyOnceWith(
      'workspace-2',
      expect.objectContaining({ workspaceIds: ['workspace-2'], pullRequests: [nextPullRequest] }),
    );
    expect(reportReadFailure).not.toHaveBeenCalled();
  });
});
