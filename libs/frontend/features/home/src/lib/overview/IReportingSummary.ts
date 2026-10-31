// #region Imports

import type { IAgentRunFigures } from './IAgentRunFigures';
import type { IReportingComparison } from './IReportingComparison';
import type { IWeeklyDeliveryCount } from './IWeeklyDeliveryCount';
import type { IWorkflowRunFigures } from './IWorkflowRunFigures';
import type { IWorkflowSuccessFigures } from './IWorkflowSuccessFigures';

// #endregion

/**
 * Every figure of the Overview's `Reporting` section for one period. A figure the recorded
 * history cannot support is absent, so the view shows `—` instead of a misleading number.
 *
 * @public
 */
export interface IReportingSummary {
  /** Work items whose latest move into Done falls in the period; absent before the stage history starts. @public @readonly */
  readonly delivered?: IReportingComparison;
  /** Median days from Qualified to Done; absent before the stage history starts or without a qualified delivery. @public @readonly */
  readonly medianLeadTimeDays?: IReportingComparison;
  /** Agent runs, which Symphony records completely. @public @readonly */
  readonly agentRuns: IAgentRunFigures;
  /** Workflow success; absent before the run history starts or without a finished run. @public @readonly */
  readonly workflowSuccess?: IWorkflowSuccessFigures;
  /** Workflow runs by outcome; absent before the run history starts. @public @readonly */
  readonly workflowRuns?: IWorkflowRunFigures;
  /** Work items moved to Done per week over eight weeks; absent while no week is recorded. @public @readonly */
  readonly deliveredPerWeek?: readonly IWeeklyDeliveryCount[];
  /** Since when stage changes are recorded (ISO); absent when none is. @public @readonly */
  readonly deliveryHistorySince?: string;
  /** Since when finished workflow runs are recorded (ISO); absent when none is. @public @readonly */
  readonly runHistorySince?: string;
}
