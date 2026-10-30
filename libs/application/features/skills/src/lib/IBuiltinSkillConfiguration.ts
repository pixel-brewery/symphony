// #region Imports

import type { IBuiltinSkill } from '@symphony/domain-skills';

// #endregion

/**
 * Shipped role fields and the installation's separately editable addition.
 *
 * @public
 */
export interface IBuiltinSkillConfiguration extends Omit<IBuiltinSkill, 'resultContract'> {
  readonly additionalInstructions: string;
}
