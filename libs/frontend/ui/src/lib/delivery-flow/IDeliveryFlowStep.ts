// #region Imports

import type { ProcessRole } from '@symphony/domain-workflow';
import type { ApplicationSettingsDto } from '@symphony/ipc-contracts-composition';
import type { DeliveryFlowStepId } from './DeliveryFlowStepId';

// #endregion

/**
 * One step of the delivery flow with the name and icon every Settings section uses for it, the
 * agent responsibilities that do the step and the built-in process roles that define how it works.
 *
 * @public
 */
export interface IDeliveryFlowStep {
  /**
   * Stable step identifier.
   *
   * @public
   * @readonly
   */
  readonly id: DeliveryFlowStepId;
  /**
   * Step name, identical in `AI team`, `Skills` and `Automation`.
   *
   * @public
   * @readonly
   */
  readonly label: string;
  /**
   * When the step happens, following the board stages.
   *
   * @public
   * @readonly
   */
  readonly description: string;
  /**
   * Registered icon name of the step.
   *
   * @public
   * @readonly
   */
  readonly icon: string;
  /**
   * Agent responsibilities (skill flow roles) that perform the step, in flow order.
   *
   * @public
   * @readonly
   */
  readonly skillFlowRoles: readonly ApplicationSettingsDto['positions'][number]['allowedRoles'][number][];
  /**
   * Built-in process roles that define how the step works, in flow order.
   *
   * @public
   * @readonly
   */
  readonly processRoles: readonly ProcessRole[];
}
