// #region Imports

import type { ILocalCiExecution } from '@symphony/domain-ci';

// #endregion

const MAXIMUM_START_DELAY_MILLISECONDS = 5_000;

/** Resolves the terminal execution created for an optimistically projected local Action. */
export function resolveLocalActionExecution(
  runId: string,
  optimisticStartedAt: string,
  executions: readonly ILocalCiExecution[],
  runAttempt?: number,
): ILocalCiExecution | undefined {
  const optimisticStart = Date.parse(optimisticStartedAt);
  if (!Number.isFinite(optimisticStart)) return undefined;

  return executions
    .filter(
      (execution) =>
        execution.ciRunId === runId &&
        (runAttempt === undefined || (execution.runAttempt ?? 1) === runAttempt),
    )
    .map((execution) => ({
      execution,
      startDelay: Date.parse(execution.startedAt) - optimisticStart,
    }))
    .filter(
      (candidate) =>
        Number.isFinite(candidate.startDelay) &&
        candidate.startDelay >= 0 &&
        candidate.startDelay <= MAXIMUM_START_DELAY_MILLISECONDS,
    )
    .toSorted((left, right) => left.startDelay - right.startDelay)[0]?.execution;
}
