// #region Imports

import type { ICiRun } from '@symphony/domain-ci';
import { describe, expect, it } from 'vitest';
import type { IActionRunRow } from './IActionRunRow';
import { resolveActionRunControls } from './resolveActionRunControls';

// #endregion

function run(status: ICiRun['status']): ICiRun {
  return {
    id: 'ci:1',
    workspaceId: 'workspace',
    ciBindingId: 'ci',
    repositoryBindingId: 'repository',
    name: 'Deploy Dev',
    status,
    externalUrl: 'https://github.com/example/product/actions/runs/1',
  };
}

function row(overrides: Partial<IActionRunRow>): IActionRunRow {
  return {
    id: 'ci:1',
    workflowName: 'Deploy Dev',
    status: 'succeeded',
    runner: 'github',
    runningLocally: false,
    ...overrides,
  };
}

describe('resolveActionRunControls', () => {
  it('stops a running GitHub run and cancels a queued one', () => {
    // act
    const running = resolveActionRunControls(
      row({ run: run('in-progress'), status: 'in-progress' }),
      true,
      undefined,
    );
    const queued = resolveActionRunControls(
      row({ run: run('queued'), status: 'queued' }),
      true,
      undefined,
    );

    // assert
    expect(running).toMatchObject({ canStop: true, canCancel: false, canRerun: false });
    expect(queued).toMatchObject({ canStop: false, canCancel: true, canRerun: false });
  });

  it('stops a local run only once it has a GitHub run', () => {
    // act
    const pending = resolveActionRunControls(
      row({ id: 'workflow:ci:101', status: 'in-progress', runner: 'local', runningLocally: true }),
      true,
      'workflow:ci:101',
    );
    const local = resolveActionRunControls(
      row({
        run: run('failed'),
        status: 'in-progress',
        runner: 'github-local',
        runningLocally: true,
      }),
      true,
      'ci:1',
    );

    // assert
    expect(pending).toMatchObject({ canStop: false, canViewLog: false, canOpenInGitHub: false });
    expect(local).toMatchObject({ canStop: true, canRerun: false, canRunLocally: false });
  });

  it('reruns, repeats locally and opens a finished run', () => {
    // act
    const controls = resolveActionRunControls(
      row({ run: run('failed'), status: 'failed' }),
      true,
      undefined,
    );
    const withoutLocal = resolveActionRunControls(
      row({ run: run('failed'), status: 'failed' }),
      false,
      undefined,
    );

    // assert
    expect(controls).toEqual({
      canViewLog: true,
      canStop: false,
      canCancel: false,
      canRerun: true,
      canRunLocally: true,
      canOpenInGitHub: true,
    });
    expect(withoutLocal.canRunLocally).toBe(false);
  });
});
