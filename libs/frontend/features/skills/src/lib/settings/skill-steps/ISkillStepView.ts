// #region Imports

import type { IDeliveryFlowStep } from '@symphony/frontend-ui';
import type { BuiltinSkillDto, SkillPackageCatalogDto } from '@symphony/ipc-contracts-skills';
import type { ISkillFlowOption } from '../../view-presenters/skillFlowPresentation/ISkillFlowOption';

// #endregion

/**
 * One delivery-flow step in `Skills`: the built-in process roles that define how it works, the
 * skill packages attached to its optional AI steps, and the optional AI steps without a package.
 *
 * @public
 */
export interface ISkillStepView {
  /**
   * The step, with its shared name and icon.
   *
   * @public
   * @readonly
   */
  readonly step: IDeliveryFlowStep;
  /**
   * The built-in process roles of the step, in flow order.
   *
   * @public
   * @readonly
   */
  readonly roles: readonly BuiltinSkillDto[];
  /**
   * The skill packages attached to the step's optional AI steps.
   *
   * @public
   * @readonly
   */
  readonly packages: readonly SkillPackageCatalogDto['packages'][number][];
  /**
   * The step's optional AI steps that have no package yet.
   *
   * @public
   * @readonly
   */
  readonly openOptions: readonly ISkillFlowOption[];
}
