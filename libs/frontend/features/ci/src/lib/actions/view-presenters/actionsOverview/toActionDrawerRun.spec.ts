// #region Imports

import type { ICiRun } from '@symphony/domain-ci';
import { describe, expect, it } from 'vitest';
import type { IActionRunRow } from './IActionRunRow';
import { toActionDrawerRun } from './toActionDrawerRun';

// #endregion

const run: ICiRun = {
  id: 'ci:1',
  workspaceId: 'workspace',
  ciBindingId: 'ci',
  repositoryBindingId: 'repository',
  name: 'Deploy Dev',
  status: 'succeeded',
  runAttempt: 1,
  externalUrl: 'https://github.com/example/product/actions/runs/1',
};

describe('toActionDrawerRun', () => {
  it('describes a GitHub run as a cloud action', () => {
    // arrange
    const row: IActionRunRow = {
      id: 'ci:1',
      run,
      workflowName: 'Deploy Dev',
      status: 'succeeded',
      runner: 'github',
      branch: 'dev',
      revision: 'e81f3b2',
      startedAt: '2026-10-30T08:00:00.000Z',
      finishedAt: '2026-10-30T08:04:00.000Z',
      runningLocally: false,
    };

    // act
    const drawerRun = toActionDrawerRun(row, 'example/product');

    // assert
    expect(drawerRun).toEqual({
      kind: 'cloud-action',
      sourceLabel: 'GitHub',
      sources: [{ kind: 'github', label: 'GitHub', state: 'succeeded' }],
      title: 'Deploy Dev',
      message: 'dev · e81f3b2',
      state: 'succeeded',
      startedAt: '2026-10-30T08:00:00.000Z',
      finishedAt: '2026-10-30T08:04:00.000Z',
      active: false,
      ciRunId: 'ci:1',
      runAttempt: 1,
      externalUrl: 'https://github.com/example/product/actions/runs/1',
    });
  });

  it('describes a local re-run with both sources and its local evidence', () => {
    // arrange
    const row: IActionRunRow = {
      id: 'ci:1',
      run,
      workflowName: 'Deploy Dev',
      status: 'failed',
      runner: 'github-local',
      startedAt: '2026-10-30T09:00:00.000Z',
      finishedAt: '2026-10-30T09:03:00.000Z',
      localExecution: {
        id: 'local-1',
        workspaceId: 'workspace',
        repositoryBindingId: 'repository',
        ciRunId: 'ci:1',
        state: 'failed',
        startedAt: '2026-10-30T09:00:00.000Z',
        finishedAt: '2026-10-30T09:03:00.000Z',
        failureLog: 'exit code 1',
        localDiagnostics: 'Swap: 4Gi',
      },
      runningLocally: false,
    };

    // act
    const drawerRun = toActionDrawerRun(row, 'example/product');

    // assert
    expect(drawerRun).toMatchObject({
      kind: 'local-action',
      sourceLabel: 'Action',
      sources: [
        { kind: 'github', label: 'GitHub', state: 'succeeded' },
        { kind: 'local-runner', label: 'Local runner', state: 'failed' },
      ],
      message: 'example/product',
      failureLog: 'exit code 1',
      localDiagnostics: 'Swap: 4Gi',
    });
  });
});
