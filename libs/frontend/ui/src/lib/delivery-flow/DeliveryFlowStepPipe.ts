// #region Imports

import { Pipe, type PipeTransform } from '@angular/core';
import { deliveryFlowStepOf } from './deliveryFlowStepOf';
import type { IDeliveryFlowStep } from './IDeliveryFlowStep';

// #endregion

/**
 * Resolves the delivery-flow step of an agent responsibility or process role, so a template can
 * label it with the step's name and icon.
 *
 * @public
 */
@Pipe({ name: 'deliveryFlowStep', standalone: true, pure: true })
export class DeliveryFlowStepPipe implements PipeTransform {
  // #region Methods

  /**
   * Transforms a role into its delivery-flow step.
   *
   * @param role - Skill flow role or process role.
   * @public
   */
  public transform(role: string): IDeliveryFlowStep | undefined {
    return deliveryFlowStepOf(role);
  }

  // #endregion
}
