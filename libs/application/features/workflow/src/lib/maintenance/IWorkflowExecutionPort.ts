// #region Imports

import type { IWorkItem } from '@symphony/domain-work';
import type { IWorkflowExecutionTrigger } from './IWorkflowExecutionTrigger';

// #endregion

/**
 * Starts the deferred roles owned by workflow maintenance.
 *
 * @remarks Maintenance awaits admission and does not consume the execution result.
 *
 * @public
 */
export interface IWorkflowExecutionPort {
  /**
   * Restarts analysis for the held work item.
   *
   * @public
   */
  startForWorkItem(
    workItem: IWorkItem,
    request?: string,
    trigger?: IWorkflowExecutionTrigger,
  ): Promise<unknown>;

  /**
   * Restarts implementation for the held work item.
   *
   * @public
   */
  startSolutionForWorkItem(
    workItem: IWorkItem,
    feedback?: string,
    trigger?: IWorkflowExecutionTrigger,
  ): Promise<unknown>;
}
