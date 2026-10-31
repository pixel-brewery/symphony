// #region Imports

import type { IWorkflowStageChange } from './IWorkflowStageChange';

// #endregion

/**
 * Recorded stage changes of a workspace scope since an instant, with the instant from which the
 * record is complete so a reader never mistakes missing history for an empty period.
 *
 * @public
 */
export interface IWorkflowStageChangeHistory {
  /**
   * Every stage change of each work item that changed stage at or after the requested instant,
   * including that item's earlier changes, newest first.
   *
   * @public
   * @readonly
   */
  readonly changes: readonly IWorkflowStageChange[];
  /**
   * The instant from which `changes` is complete: the earliest stage change recorded in the
   * scope, or the oldest returned one when the maximum cut the list. Absent when the scope has
   * no recorded stage change.
   *
   * @public
   * @readonly
   */
  readonly recordedSince?: string;
  /** Whether the maximum cut older changes from the list. @public @readonly */
  readonly truncated: boolean;
}
