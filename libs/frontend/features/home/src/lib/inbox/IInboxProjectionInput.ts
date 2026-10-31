// #region Imports

import type { ICiRun } from '@symphony/domain-ci';
import type { IPullRequestSummary } from '@symphony/domain-delivery';
import type {
  IDeliveryGroupProposal,
  IExecutionQueueEntry,
  IExecutionRecord,
  IGoalRecord,
} from '@symphony/domain-execution';
import type { IAgentProfile, IAgentTeam } from '@symphony/domain-team';
import type { IBoardColumn, IWorkItem } from '@symphony/domain-work';
import type { IWorkflowStage, IWorkItemReadiness } from '@symphony/domain-workflow';

// #endregion

/**
 * Everything the Inbox projection reads, taken from the active workspace's snapshot and settings.
 *
 * @public
 */
export interface IInboxProjectionInput {
  /** Work items of the active scope. @public @readonly */
  readonly workItems: readonly IWorkItem[];
  /** Board columns, to name an item's column. @public @readonly */
  readonly boardColumns: readonly IBoardColumn[];
  /** Every recorded execution. @public @readonly */
  readonly executions: readonly IExecutionRecord[];
  /** Accepted steps waiting for a free slot. @public @readonly */
  readonly executionQueue: readonly IExecutionQueueEntry[];
  /** Stages of the workflow. @public @readonly */
  readonly stages: readonly IWorkflowStage[];
  /** What the readiness guards would find per item. @public @readonly */
  readonly readiness: readonly IWorkItemReadiness[];
  /** Delegated goals. @public @readonly */
  readonly goals: readonly IGoalRecord[];
  /** Analyzer proposals to deliver items together. @public @readonly */
  readonly deliveryGroupProposals: readonly IDeliveryGroupProposal[];
  /** Pull requests of the active scope. @public @readonly */
  readonly pullRequests: readonly IPullRequestSummary[];
  /** Cached workflow runs of the active scope. @public @readonly */
  readonly ciRuns: readonly ICiRun[];
  /** Agent profiles, to name the agent of a step and to offer assignments. @public @readonly */
  readonly agents: readonly IAgentProfile[];
  /** Agent teams, to delegate an assignment through the right team. @public @readonly */
  readonly teams: readonly IAgentTeam[];
  /** Reference time in epoch milliseconds. @public @readonly */
  readonly now: number;
  /** Entries snoozed for this session, by entry id, until the given epoch milliseconds. @public @readonly */
  readonly snoozedUntil: ReadonlyMap<string, number>;
}
