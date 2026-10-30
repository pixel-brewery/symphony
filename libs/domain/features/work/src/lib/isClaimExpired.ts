// #region Imports

import type { IWorkItemCoordination } from './IWorkItemCoordination';

// #endregion

/** Whether a shared claim may be taken over because its lease elapsed. */
export function isClaimExpired(
  coordination: Pick<IWorkItemCoordination, 'leaseUntil'>,
  now: Date,
): boolean {
  if (!coordination.leaseUntil) return false;
  const leaseUntil = new Date(coordination.leaseUntil).getTime();
  return !Number.isNaN(leaseUntil) && leaseUntil <= now.getTime();
}
