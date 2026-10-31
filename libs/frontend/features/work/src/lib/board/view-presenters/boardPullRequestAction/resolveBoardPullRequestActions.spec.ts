// #region Imports

import type { ICiRun } from '@symphony/domain-ci';
import type { IPullRequestSummary } from '@symphony/domain-delivery';
import { describe, expect, it } from 'vitest';
import { resolveBoardPullRequestActions, type IBoardPullRequestContext } from './';

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

function run(overrides: Partial<ICiRun> = {}): ICiRun {
  return {
    id: 'run-1',
    workspaceId: 'personal',
    repositoryBindingId: 'repository-1',
    workflowId: 'verify',
    workflowName: 'Verify',
    branch: 'codex/work-146',
    status: 'completed',
    conclusion: 'success',
    startedAt: '2026-08-21T06:20:00.000Z',
    externalUrl: 'https://github.com/owner/repository/actions/runs/1',
    ...overrides,
  } as ICiRun;
}

describe('resolveBoardPullRequestActions', () => {
  const context = (
    overrides: Partial<IBoardPullRequestContext> = {},
  ): IBoardPullRequestContext => ({
    reference: {
      number: 211,
      externalUrl: pullRequestUrl,
      branchUrl: `${pullRequestUrl}/files`,
    },
    summary,
    run: run(),
    ...overrides,
  });

  it('offers the run actions of the pull request itself', () => {
    // arrange
    const actions = resolveBoardPullRequestActions(context(), { localCiEnabled: true });

    // act
    const actual = actions.map((action) => [action.id, action.label]);

    // assert
    expect(actual).toEqual([
      ['open', 'Open in GitHub'],
      ['remote', 'Run remotely'],
      ['local', 'Run locally'],
    ]);
    expect(actions.every((action) => !action.blockedReason)).toBe(true);
  });

  it('turns both entries into their cancellation while the run is going', () => {
    // arrange
    const active = context({ run: run({ status: 'in-progress' }) });

    const remote = resolveBoardPullRequestActions(active, { localCiEnabled: true });
    const local = resolveBoardPullRequestActions(context(), {
      localCiEnabled: true,
      localRunId: 'run-1',
    });

    // act
    const actual = remote.find((action) => action.id === 'remote');

    // assert
    expect(actual).toMatchObject({
      label: 'Cancel remote run',
      variant: 'danger',
      cancels: true,
      runId: 'run-1',
    });
    expect(local.find((action) => action.id === 'local')).toMatchObject({
      label: 'Stop local runner',
      variant: 'danger',
      cancels: true,
      runId: 'run-1',
    });
  });

  it('keeps the entry count stable so the open submenu never loses a child', () => {
    // Mosaik marks a popover parent childless once a projected child is removed, so a state
    // change may relabel an entry but must never drop one.
    // arrange
    const idle = resolveBoardPullRequestActions(context(), { localCiEnabled: true });
    const running = resolveBoardPullRequestActions(context({ run: run({ status: 'queued' }) }), {
      localCiEnabled: true,
      localRunId: 'run-1',
    });

    // act
    const actual = running.map((action) => action.id);

    // assert
    expect(actual).toEqual(idle.map((action) => action.id));
  });

  it('hides the local entry when local CI is switched off', () => {
    // arrange
    const actions = resolveBoardPullRequestActions(context(), { localCiEnabled: false });

    // act
    const actual = actions.map((action) => action.id);

    // assert
    expect(actual).toEqual(['open', 'remote']);
  });

  it('says why a run cannot be started instead of dropping the entry', () => {
    // arrange
    const withoutRun = resolveBoardPullRequestActions(context({ run: undefined }), {
      localCiEnabled: true,
    });
    // act
    const unlisted = resolveBoardPullRequestActions(
      context({ summary: undefined, run: undefined }),
      { localCiEnabled: true },
    );
    // assert
    expect(unlisted.find((action) => action.id === 'remote')?.blockedReason).toBe(
      'This pull request is not in the loaded list.',
    );
    const busy = resolveBoardPullRequestActions(context(), {
      localCiEnabled: true,
      localRunId: 'run-of-another-card',
    });

    expect(withoutRun.find((action) => action.id === 'remote')?.blockedReason).toBe(
      'No workflow run exists for this branch yet.',
    );
    expect(withoutRun.find((action) => action.id === 'open')?.blockedReason).toBeUndefined();
    expect(busy.find((action) => action.id === 'local')?.blockedReason).toBe(
      'The local runner is busy with another run.',
    );
  });
});
