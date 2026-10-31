// #region Imports

import { describe, expect, it } from 'vitest';
import type { IRailRun } from './IRailRun';
import { resolveMenuBarStatus } from './resolveMenuBarStatus';

// #endregion

function run(id: string, state: string, active = false, sources?: IRailRun['sources']): IRailRun {
  return {
    id,
    kind: 'agent',
    sourceLabel: 'Agent',
    title: id,
    message: id,
    state,
    statusLabel: state,
    startedAt: '2026-09-18T08:00:00.000Z',
    active,
    ...(sources ? { sources } : {}),
  };
}

describe('resolveMenuBarStatus', () => {
  it('prefers a live run over completed history', () => {
    // arrange
    const runs = [run('live', 'running', true), run('failed', 'failed')];

    // act
    const status = resolveMenuBarStatus(runs);

    // assert
    expect(status).toBe('running');
  });

  it('reports a failure from the newest completed run or one of its sources', () => {
    // arrange
    const failedSource = run('local', 'succeeded', false, [
      { kind: 'github', label: 'GitHub', state: 'failed' },
      { kind: 'local-runner', label: 'Local runner', state: 'succeeded' },
    ]);

    // act
    const directFailure = resolveMenuBarStatus([run('failed', 'failed')]);
    const sourceFailure = resolveMenuBarStatus([failedSource]);

    // assert
    expect(directFailure).toBe('failed');
    expect(sourceFailure).toBe('failed');
  });

  it('clears an older failure after a newer successful completion', () => {
    // arrange
    const runs = [run('success', 'succeeded'), run('failed', 'failed')];

    // act
    const status = resolveMenuBarStatus(runs);

    // assert
    expect(status).toBe('idle');
  });
});
