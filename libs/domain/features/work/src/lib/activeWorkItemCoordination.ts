// #region Imports

import type { IWorkItemCoordination } from './IWorkItemCoordination';
import { isClaimExpired } from './isClaimExpired';

// #endregion

/**
 * The shared claim while its lease still binds.
 *
 * The `expired` flag is stamped when the provider last synchronized, so a lease that elapses
 * afterwards would keep blocking every surface until the next successful sync. Evaluating the
 * lease against the caller's clock keeps a dead claim from locking an item indefinitely.
 */
export function activeWorkItemCoordination(
  coordination: IWorkItemCoordination | undefined,
  now: Date,
): IWorkItemCoordination | undefined {
  if (!coordination || coordination.expired || isClaimExpired(coordination, now)) return undefined;
  return coordination;
}
