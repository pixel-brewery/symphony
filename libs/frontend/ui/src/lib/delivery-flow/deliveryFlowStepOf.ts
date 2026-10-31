// #region Imports

import { deliveryFlowSteps } from './DeliveryFlowSteps';
import type { IDeliveryFlowStep } from './IDeliveryFlowStep';

// #endregion

/**
 * Resolves the delivery-flow step an agent responsibility (skill flow role) or a built-in process
 * role belongs to.
 *
 * @param role - Skill flow role such as `ci-repair`, or process role such as `verify`.
 * @returns The owning step, or `undefined` for an unknown role.
 * @public
 */
export function deliveryFlowStepOf(role: string): IDeliveryFlowStep | undefined {
  return deliveryFlowSteps.find(
    (step) =>
      step.skillFlowRoles.some((candidate) => candidate === role) ||
      step.processRoles.some((candidate) => candidate === role),
  );
}
