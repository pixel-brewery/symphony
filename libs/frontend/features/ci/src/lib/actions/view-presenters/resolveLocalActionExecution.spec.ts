// #region Imports

import type { ILocalCiExecution } from '@symphony/domain-ci';
import { describe, expect, it } from 'vitest';
import { resolveLocalActionExecution } from './resolveLocalActionExecution';

// #endregion

describe('resolveLocalActionExecution', () => {
  it('resolves the authoritative execution started shortly after the optimistic projection', () => {
    // arrange
    const execution = localExecution('current', '2026-08-17T12:00:00.420Z');

    // act
    const actual = resolveLocalActionExecution('ci-1', '2026-08-17T12:00:00.000Z', [execution]);

    // assert
    expect(actual).toBe(execution);
  });

  it('prefers the nearest matching execution when the same workflow run is reused', () => {
    // arrange
    const current = localExecution('current', '2026-08-17T12:00:00.300Z');
    const rerun = localExecution('rerun', '2026-08-17T12:00:03.000Z');

    // act
    const actual = resolveLocalActionExecution('ci-1', '2026-08-17T12:00:00.000Z', [
      rerun,
      current,
    ]);

    // assert
    expect(actual).toBe(current);
  });

  it('does not substitute unrelated historical evidence', () => {
    // arrange
    const historical = localExecution('historical', '2026-08-17T11:59:59.000Z');
    const later = localExecution('later', '2026-08-17T12:00:06.000Z');

    // act
    const actual = resolveLocalActionExecution('ci-1', '2026-08-17T12:00:00.000Z', [
      historical,
      later,
    ]);

    // assert
    expect(actual).toBeUndefined();
  });

  it('does not substitute evidence from an earlier attempt of the same run', () => {
    // arrange
    const firstAttempt = localExecution('first-attempt', '2026-08-17T12:00:00.300Z', 1);
    const secondAttempt = localExecution('second-attempt', '2026-08-17T12:00:00.500Z', 2);

    // act
    const actual = resolveLocalActionExecution(
      'ci-1',
      '2026-08-17T12:00:00.000Z',
      [firstAttempt, secondAttempt],
      2,
    );

    // assert
    expect(actual).toBe(secondAttempt);
  });
});

function localExecution(id: string, startedAt: string, runAttempt?: number): ILocalCiExecution {
  return {
    id,
    workspaceId: 'workspace-1',
    repositoryBindingId: 'repository-1',
    ciRunId: 'ci-1',
    ...(runAttempt ? { runAttempt } : {}),
    state: 'failed',
    startedAt,
    finishedAt: '2026-08-17T12:01:00.000Z',
  };
}
