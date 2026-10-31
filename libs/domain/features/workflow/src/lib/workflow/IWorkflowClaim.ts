// #region Imports

import type { ProcessRole } from './ProcessRole';

// #endregion

// --------------------------------------------------------------------------------------
// Runtime record
// --------------------------------------------------------------------------------------

/**
 * Exclusive ownership of one work item for one run. `claimVersion` is a monotonic fencing
 * token: a worker whose token is behind the record must never write a result.
 */
export interface IWorkflowClaim {
  readonly runId: string;
  readonly role: ProcessRole;
  readonly owner: string;
  readonly acquiredAt: string;
  readonly leaseUntil: string;
  readonly heartbeatAt: string;
  readonly claimVersion: number;
  /** Provider-side proof of the claim, when the tracker supports distributed locking. */
  readonly externalReference?: string;
}
