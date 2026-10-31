// #region Imports

import type { ExecutionQueueKind } from './ExecutionQueueKind';

// #endregion

/**
 * One accepted step that is waiting for a free execution slot.
 *
 * Execution capacity is a hard limit, but reaching it is not a reason to lose an operator's
 * decision: the request is kept as an *intent* instead of a run. Nothing expensive is reserved
 * here - no workspace, no distributed claim, no agent session - because the run is only built
 * when a slot actually opens. That also means the queue survives a restart: the entry carries
 * everything the orchestrator needs to start the step later without the operator present.
 */
export interface IExecutionQueueEntry {
  id: string;
  /** Security and ownership boundary the queued step will run in. */
  workspaceId?: string;
  workItemId: string;
  /** Provider-facing identity, kept so surfaces can label the entry without the work item. */
  workItemExternalId: string;
  workItemTitle: string;
  kind: ExecutionQueueKind;
  /** Operator prompt (analysis) or requested changes (implementation), carried into the run. */
  request?: string;
  /** Local-execution approval already granted when the entry was accepted. */
  executionApproval?: 'once' | 'repository';
  /** Who put the step in the queue; autonomy never queues behind an operator. */
  origin: 'operator' | 'autonomy';
  queuedAt: string;
  /** Why the last drain attempt could not start this entry. Cleared once it starts. */
  lastError?: string;
  lastAttemptAt?: string;
}
