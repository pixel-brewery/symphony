// #region Imports

import type { AssistanceAction } from './AssistanceAction';

// #endregion

/** Durable proof that one orchestrator owns a work item across its analysis/solution lifecycle. */
export interface IWorkItemClaim {
  id: string;
  workItemId: string;
  action: Exclude<AssistanceAction, 'none' | 'create'>;
  owner: string;
  acquiredAt: string;
  /**
   * Instant after which another orchestrator may take the claim over. Carried in the shared
   * provider record, not only locally, so a crashed worker cannot hold a work item forever.
   */
  leaseUntil?: string;
  /** Last proof of life the owner wrote into the shared claim. */
  heartbeatAt?: string;
  /**
   * Monotonic fencing token. Every takeover raises it, and a worker whose token is behind the
   * shared claim must not write results any more.
   */
  claimVersion?: number;
  releasedAt?: string;
}
