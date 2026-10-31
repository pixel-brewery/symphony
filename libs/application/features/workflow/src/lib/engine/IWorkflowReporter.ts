// #region Imports

import type { IRunResult, IWorkflowRecord, ProcessRole } from '@symphony/domain-workflow';
import type { IWorkItem, IWorkItemClaim } from '@symphony/domain-work';

// #endregion

/**
 * Receives execution facts through the workflow supervisor's guarded transitions.
 *
 * @public
 */
export interface IWorkflowReporter {
  /**
   * Records the role and run that started for a work item.
   *
   * @public
   */
  runStarted(item: IWorkItem, role: ProcessRole, runId: string): void;

  /**
   * Applies a completed run through the supervisor's transition guards.
   *
   * @public
   */
  applyRunResult(item: IWorkItem, result: IRunResult): Promise<IWorkflowRecord | undefined>;

  /**
   * Applies a claim-triggered transition and rejects claims whose guards fail.
   *
   * Optional compositions without a supervisor retain their existing direct move.
   *
   * @public
   */
  applyClaim?(
    item: IWorkItem,
    role: ProcessRole,
    runId: string,
    claim?: IWorkItemClaim,
  ): Promise<IWorkItem>;
}
