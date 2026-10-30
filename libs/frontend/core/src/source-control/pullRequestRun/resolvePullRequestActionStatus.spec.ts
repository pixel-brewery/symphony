// #region Imports

import { describe, expect, it } from 'vitest';
import type { ICiRun } from '@symphony/domain-ci';
import type { IPullRequestSummary } from '@symphony/domain-delivery';
import { resolvePullRequestActionStatus } from './';

// #endregion

describe('resolvePullRequestActionStatus', () => {
  it('projects an active local run immediately over the source cloud state', () => {
    // arrange
    const pullRequest = pullRequestSummary();
    const run = ciRun({
      id: 'run-local-source',
      status: 'failed',
      startedAt: '2026-08-14T12:00:00Z',
    });

    // act
    const actual = resolvePullRequestActionStatus(pullRequest, [run], [], {
      runId: run.id,
      startedAt: '2026-08-15T08:00:00Z',
    });

    // assert
    expect(actual).toEqual({
      run,
      source: 'local',
      state: 'in-progress',
      active: true,
      startedAt: '2026-08-15T08:00:00Z',
    });
  });

  it('keeps a queued cloud run static until execution starts', () => {
    // arrange
    const pullRequest = pullRequestSummary();
    const run = ciRun({ status: 'queued' });

    // act
    const actual = resolvePullRequestActionStatus(pullRequest, [run], []);

    // assert
    expect(actual).toEqual({
      run,
      source: 'cloud',
      state: 'queued',
      active: false,
      startedAt: '2026-08-14T11:00:00Z',
    });
  });

  it('keeps the newest completed local result visible until a newer cloud run exists', () => {
    // arrange
    const pullRequest = pullRequestSummary();
    const sourceRun = ciRun({ id: 'run-local-source', startedAt: '2026-08-14T12:00:00Z' });
    const localExecution = {
      id: 'local-1',
      workspaceId: 'workspace-1',
      repositoryBindingId: sourceRun.repositoryBindingId,
      ciRunId: sourceRun.id,
      state: 'succeeded',
      startedAt: '2026-08-15T08:00:00Z',
      finishedAt: '2026-08-15T08:10:00Z',
      runner: {
        kind: 'managed-linux-vm',
        os: 'linux',
        architecture: 'arm64',
        label: 'runner-1',
        imageVersion: 'ubuntu-24.04',
      },
    } as const;

    // act
    const actual = resolvePullRequestActionStatus(pullRequest, [sourceRun], [localExecution]);

    // assert
    expect(actual).toMatchObject({
      source: 'local',
      state: 'succeeded',
      active: false,
    });
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
