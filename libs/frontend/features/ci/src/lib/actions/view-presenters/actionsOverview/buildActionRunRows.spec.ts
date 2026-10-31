// #region Imports

import type { ICiRun, ICiWorkflow, ILocalCiExecution } from '@symphony/domain-ci';
import { describe, expect, it } from 'vitest';
import { buildActionRunRows } from './buildActionRunRows';

// #endregion

function run(id: string, overrides: Partial<ICiRun> = {}): ICiRun {
  return {
    id,
    workspaceId: 'workspace',
    ciBindingId: 'ci',
    repositoryBindingId: 'repository',
    workflowId: 'ci:101',
    name: 'Deploy Dev',
    status: 'succeeded',
    branch: 'dev',
    revision: 'e81f3b2',
    event: 'push',
    runAttempt: 1,
    startedAt: '2026-10-30T08:00:00.000Z',
    finishedAt: '2026-10-30T08:04:00.000Z',
    ...overrides,
  };
}

function local(ciRunId: string, overrides: Partial<ILocalCiExecution> = {}): ILocalCiExecution {
  return {
    id: `local-${ciRunId}`,
    workspaceId: 'workspace',
    repositoryBindingId: 'repository',
    ciRunId,
    runAttempt: 1,
    state: 'failed',
    startedAt: '2026-10-30T09:00:00.000Z',
    finishedAt: '2026-10-30T09:03:00.000Z',
    ...overrides,
  };
}

const workflow: ICiWorkflow = {
  id: 'ci:101',
  workspaceId: 'workspace',
  ciBindingId: 'ci',
  repositoryBindingId: 'repository',
  name: 'Deploy Dev',
  path: '.github/workflows/deploy.yml',
  state: 'active',
  defaultBranch: 'dev',
  supportsManualDispatch: true,
};

describe('buildActionRunRows', () => {
  it('lists GitHub runs newest first on the GitHub runner', () => {
    // arrange
    const older = run('ci:1');
    const newer = run('ci:2', {
      startedAt: '2026-10-30T10:00:00.000Z',
      finishedAt: undefined,
      status: 'in-progress',
    });

    // act
    const rows = buildActionRunRows({
      runs: [older, newer],
      localExecutions: [],
      workflows: [workflow],
    });

    // assert
    expect(rows.map((row) => [row.id, row.status, row.runner])).toEqual([
      ['ci:2', 'in-progress', 'github'],
      ['ci:1', 'succeeded', 'github'],
    ]);
  });

  it('takes the newer local verdict of the same attempt and marks both runners', () => {
    // arrange
    const passedOnGitHub = run('ci:1');

    // act
    const [row] = buildActionRunRows({
      runs: [passedOnGitHub],
      localExecutions: [
        local('ci:1'),
        local('ci:1', { id: 'stale', runAttempt: 2, state: 'succeeded' }),
      ],
      workflows: [workflow],
    });

    // assert
    expect(row).toMatchObject({
      status: 'failed',
      runner: 'github-local',
      startedAt: '2026-10-30T09:00:00.000Z',
      finishedAt: '2026-10-30T09:03:00.000Z',
      localExecution: { id: 'local-ci:1' },
      runningLocally: false,
    });
  });

  it('shows the run the local runner executes now as running locally', () => {
    // arrange
    const failed = run('ci:1', { status: 'failed' });

    // act
    const [row] = buildActionRunRows({
      runs: [failed],
      localExecutions: [],
      activeLocalRun: { runId: 'ci:1', startedAt: '2026-10-30T11:00:00.000Z' },
      workflows: [workflow],
    });

    // assert
    expect(row).toMatchObject({
      status: 'in-progress',
      runner: 'github-local',
      runningLocally: true,
    });
    expect(row?.finishedAt).toBeUndefined();
  });

  it('keeps a pending local workflow start and orphaned local history', () => {
    // act
    const rows = buildActionRunRows({
      runs: [],
      localExecutions: [local('ci:gone', { state: 'succeeded' })],
      activeLocalRun: { runId: 'workflow:ci:101', startedAt: '2026-10-30T12:00:00.000Z' },
      workflows: [workflow],
    });

    // assert
    expect(rows).toEqual([
      expect.objectContaining({
        id: 'workflow:ci:101',
        workflowId: 'ci:101',
        workflowName: 'Deploy Dev',
        status: 'in-progress',
        runner: 'local',
        runningLocally: true,
      }),
      expect.objectContaining({
        id: 'ci:gone',
        workflowName: 'Local workflow',
        status: 'succeeded',
        runner: 'local',
      }),
    ]);
  });
});
