// #region Imports

import type { ICiRun, ILocalCiExecution } from '@symphony/domain-ci';
import type { IPullRequestSummary } from '@symphony/domain-delivery';
import type { IExecutionRecord, IGoalRecord } from '@symphony/domain-execution';
import type { IAgentProfile } from '@symphony/domain-team';
import type { IWorkflowStage } from '@symphony/domain-workflow';
import type { IInboxEntry } from './IInboxEntry';

// #endregion

/**
 * What the stepper of one Inbox entry reads.
 *
 * @public
 */
export interface IInboxStepInput {
  /** The entry whose work item the stepper describes. @public @readonly */
  readonly entry: IInboxEntry;
  /** Every recorded execution. @public @readonly */
  readonly executions: readonly IExecutionRecord[];
  /** Delegated goals. @public @readonly */
  readonly goals: readonly IGoalRecord[];
  /** Stages of the workflow. @public @readonly */
  readonly stages: readonly IWorkflowStage[];
  /** Pull requests of the active scope. @public @readonly */
  readonly pullRequests: readonly IPullRequestSummary[];
  /** Cached workflow runs of the active scope. @public @readonly */
  readonly ciRuns: readonly ICiRun[];
  /** Local runs of those workflows. @public @readonly */
  readonly localCiExecutions: readonly ILocalCiExecution[];
  /** Agent profiles, to name the agent of a stage. @public @readonly */
  readonly agents: readonly IAgentProfile[];
}
