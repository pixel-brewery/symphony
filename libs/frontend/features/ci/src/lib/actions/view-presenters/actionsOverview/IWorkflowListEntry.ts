// #region Imports

import type { ICiWorkflow } from '@symphony/domain-ci';
import type { WorkflowHealth } from './WorkflowHealth';

// #endregion

/**
 * One entry of the `WORKFLOWS` list.
 *
 * @public
 */
export interface IWorkflowListEntry {
  /** The workflow definition. @public @readonly */
  readonly workflow: ICiWorkflow;
  /** The state its dot shows. @public @readonly */
  readonly health: WorkflowHealth;
}
