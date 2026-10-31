// #region Imports

import type { IWorkItem } from '@symphony/domain-work';
import type { ClosureReasonCode, WorkflowStageId } from '@symphony/domain-workflow';

// #endregion

/**
 * Carries the provider transitions owned by the workflow supervisor.
 *
 * @public
 */
export interface IWorkflowTrackingPort {
  /**
   * Applies the configured workflow stage and returns the provider's resulting item.
   *
   * @public
   */
  transition(workItemId: string, state: WorkflowStageId): Promise<IWorkItem>;

  /**
   * Closes the provider item when the integration supports explicit closure.
   *
   * @public
   */
  closeWorkItem?(workItemId: string, reason: ClosureReasonCode): Promise<IWorkItem>;
}
