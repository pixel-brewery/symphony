// #region Imports

import type { IDeliveryFlowStep } from '@symphony/frontend-ui';
import type { IWorkspaceAgentView } from '../workspace-organization/IWorkspaceAgentView';

// #endregion

/**
 * One delivery-flow step of a workspace with the agents who do it.
 *
 * @public
 */
export interface IDeliveryFlowStepView {
  /**
   * The step, with its shared name and icon.
   *
   * @public
   * @readonly
   */
  readonly step: IDeliveryFlowStep;
  /**
   * The agent who does the step first, then its backups in the order they take over. Empty when
   * nobody is assigned.
   *
   * @public
   * @readonly
   */
  readonly agents: readonly IWorkspaceAgentView[];
}
