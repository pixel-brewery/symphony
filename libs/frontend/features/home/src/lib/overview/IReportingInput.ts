// #region Imports

import type { ICiRun, ICiRunHistory } from '@symphony/domain-ci';
import type { IExecutionRecord } from '@symphony/domain-execution';
import type { IWorkflowDefinition, IWorkflowStageChangeHistory } from '@symphony/domain-workflow';
import type { ReportingPeriod } from './ReportingPeriod';

// #endregion

/**
 * What the reporting projection reads.
 *
 * @public
 */
export interface IReportingInput {
  /** The selected period. @public @readonly */
  readonly period: ReportingPeriod;
  /** Reference time in epoch milliseconds. @public @readonly */
  readonly now: number;
  /** Every recorded execution. @public @readonly */
  readonly executions: readonly IExecutionRecord[];
  /** Current workflow runs of the active scope, including the queued and running ones. @public @readonly */
  readonly ciRuns: readonly ICiRun[];
  /**
   * Recorded stage changes of the active scope; absent while loading or after a failed read,
   * which leaves `Delivered`, `Median lead time` and `Delivered per week` without a value.
   *
   * @public
   * @readonly
   */
  readonly stageHistory?: Pick<IWorkflowStageChangeHistory, 'changes' | 'recordedSince'>;
  /** The workflow whose stages the recorded changes refer to. @public @readonly */
  readonly workflow?: Pick<IWorkflowDefinition, 'initialStageId' | 'stages'>;
  /**
   * Recorded finished workflow runs of the active scope; absent while loading or after a failed
   * read, which leaves `Workflow success` and `Workflow runs` without a value.
   *
   * @public
   * @readonly
   */
  readonly runHistory?: Pick<ICiRunHistory, 'runs' | 'recordedSince'>;
}
