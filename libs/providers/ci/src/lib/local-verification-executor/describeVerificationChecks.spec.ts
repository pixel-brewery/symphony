// #region Imports

import { describe, expect, it } from 'vitest';
import { describeVerificationChecks } from './describeVerificationChecks';

// #endregion

describe('describeVerificationChecks', () => {
  const steps = [
    { ...yarnStep(), id: 'node-restore', label: 'yarn dependencies' },
    yarnStep(),
  ] as const;

  it('carries the failing output so a blocked run names its actual cause', () => {
    // arrange
    const results = [
      {
        stepId: 'node-restore',
        state: 'failed' as const,
        startedAt: '2026-08-20T00:00:00.000Z',
        finishedAt: '2026-08-20T00:00:01.000Z',
        exitCode: 1,
        output: 'Usage Error: Invalid value for --mode',
      },
    ];

    // act
    const checks = describeVerificationChecks(steps, results);

    // assert
    expect(checks[0]).toEqual({
      label: 'yarn dependencies',
      state: 'failed',
      detail: 'yarn dependencies failed (exit 1). Usage Error: Invalid value for --mode',
      output: 'Usage Error: Invalid value for --mode',
    });
  });

  it('marks steps after the first failure as not run instead of failed on their own', () => {
    // arrange
    const results = [
      {
        stepId: 'node-restore',
        state: 'failed' as const,
        startedAt: '2026-08-20T00:00:00.000Z',
        finishedAt: '2026-08-20T00:00:01.000Z',
        exitCode: 1,
        output: 'boom',
      },
    ];

    // act
    const checks = describeVerificationChecks(steps, results);

    // assert
    expect(checks[1]).toEqual({
      label: 'yarn lint',
      state: 'failed',
      detail: 'yarn lint was not run because an earlier verification step failed.',
    });
  });

  it('bounds long failure output to its tail and keeps passed checks detail-free', () => {
    // arrange
    const results = [
      {
        stepId: 'node-restore',
        state: 'succeeded' as const,
        startedAt: '2026-08-20T00:00:00.000Z',
        finishedAt: '2026-08-20T00:00:01.000Z',
        exitCode: 0,
        output: 'done',
      },
      {
        stepId: 'node-lint',
        state: 'failed' as const,
        startedAt: '2026-08-20T00:00:01.000Z',
        finishedAt: '2026-08-20T00:00:02.000Z',
        exitCode: 2,
        output: `${'x'.repeat(2_000)}the-actual-error`,
      },
    ];

    // act
    const checks = describeVerificationChecks(steps, results);

    // assert
    expect(checks[0]).toEqual({ label: 'yarn dependencies', state: 'passed' });
    expect(checks[1]?.detail).toContain('the-actual-error');
    expect(checks[1]?.detail?.length).toBeLessThan(800);
    expect(checks[1]?.output).toContain('the-actual-error');
    expect(checks[1]?.output?.length).toBeGreaterThan(checks[1]!.detail!.length);
  });
});

function yarnStep() {
  return {
    id: 'node-lint',
    kind: 'lint',
    label: 'yarn lint',
    executable: 'yarn',
    arguments: ['lint'],
    workingDirectory: '.',
    timeoutSeconds: 10,
    network: 'none',
    artifactPaths: [],
  } as const;
}
