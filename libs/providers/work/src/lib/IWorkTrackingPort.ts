// #region Imports

import type {
  IWorkItemTrackingPort,
  IWorkTrackingProjectionPort,
} from '@symphony/application-work';
import type { IExecutionTrackingPort } from '@symphony/application-execution';
import type { IAutomationTrackingPort } from '@symphony/application-automation';
import type { IWorkflowTrackingPort } from '@symphony/application-workflow';
import type { IFeedbackIntakeTrackingPort } from '@symphony/application-feedback';
import type { IBoardColumnCandidate, WorkItemSource } from '@symphony/domain-work';

// #endregion

/**
 * Composes the narrow tracker capabilities implemented by the concrete provider adapters.
 *
 * @public
 */
export interface IWorkTrackingPort
  extends
    IWorkItemTrackingPort,
    IWorkTrackingProjectionPort,
    IExecutionTrackingPort,
    IAutomationTrackingPort,
    IWorkflowTrackingPort,
    IFeedbackIntakeTrackingPort {
  /**
   * Reads the columns of an unsaved source before its configuration is persisted.
   *
   * @public
   */
  listSourceColumns?(source: WorkItemSource): Promise<readonly IBoardColumnCandidate[]>;
}
