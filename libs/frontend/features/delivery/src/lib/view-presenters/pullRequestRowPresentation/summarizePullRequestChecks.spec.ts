// #region Imports

import type { ICiRun } from '@symphony/domain-ci';
import { describe, expect, it } from 'vitest';
import { summarizePullRequestChecks } from './summarizePullRequestChecks';

// #endregion

describe('summarizePullRequestChecks', () => {
  it.each([
    [[], 'none'],
    [['succeeded', 'succeeded'], 'passed'],
    [['succeeded', 'in-progress'], 'running'],
    [['queued'], 'running'],
    [['failed', 'in-progress', 'succeeded'], 'failing'],
    [['succeeded', 'cancelled'], 'cancelled'],
  ] as const)('combines %j into %s', (states, expected) => {
    // arrange
    const checks = states.map((state, index) => check(`check-${index}`, state));

    // act
    const summary = summarizePullRequestChecks(checks);

    // assert
    expect(summary.state).toBe(expected);
    expect(summary.total).toBe(states.length);
  });

  it('counts and names the failed checks', () => {
    // arrange
    const checks = [check('lint', 'failed'), check('unit', 'failed'), check('CodeQL', 'succeeded')];

    // act
    const summary = summarizePullRequestChecks(checks);

    // assert
    expect(summary).toEqual({
      state: 'failing',
      failing: 2,
      failingNames: ['lint', 'unit'],
      total: 3,
    });
  });
});

function check(name: string, state: ICiRun['status']) {
  return { state, run: { name } as ICiRun };
}
