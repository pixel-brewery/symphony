// #region Imports

import type { BlockedReasonCode } from './BlockedReasonCode';
import type { ClosureReasonCode } from './ClosureReasonCode';
import type { ProcessRole } from './ProcessRole';
import type { ReasonCode } from './ReasonCode';
import type { RunOutcome } from './RunOutcome';

// #endregion

export interface IWorkflowRouting {
  readonly lastOutcome?: RunOutcome;
  readonly lastReasonCode?: ReasonCode;
  readonly blockedReason?: BlockedReasonCode;
  readonly blockedSince?: string;
  readonly blockingWorkItemIds?: readonly string[];
  readonly nextRetryAt?: string;
  /** Role the scheduler restarts when a retry falls due or a blocker resolves. */
  readonly resumeRole?: ProcessRole;
  readonly closureReason?: ClosureReasonCode;
}
