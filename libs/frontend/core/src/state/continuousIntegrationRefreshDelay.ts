// #region Imports

import type { ICiRun } from '@symphony/domain-ci';
import type { IRemoteDataStatus } from '@symphony/domain-core';

// #endregion

/**
 * Chooses the next CI poll. A stale remote projection is already a failed retry; cached running
 * rows must not turn it into an endless GitHub request loop. Local runs remain live independently.
 *
 * @param localRunActive - Whether Symphony owns a running local CI process.
 * @param runs - Latest projected CI runs.
 * @param remoteState - Availability of the remote CI provider.
 * @public
 */
export function continuousIntegrationRefreshDelay(
  localRunActive: boolean,
  runs: readonly Pick<ICiRun, 'status'>[],
  remoteState: IRemoteDataStatus['state'] | undefined,
): number | undefined {
  if (localRunActive) return 10_000;
  if (remoteState && remoteState !== 'current') return undefined;
  if (runs.some((run) => run.status === 'in-progress')) return 10_000;
  return runs.some((run) => run.status === 'queued') ? 30_000 : undefined;
}
