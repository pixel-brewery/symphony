// #region Imports

import type { IAgentPhaseAssignment } from '@symphony/domain-team';
import type { BuiltinSkillDto } from '@symphony/ipc-contracts-skills';

// #endregion

/**
 * Applies Skills mutations through the authoritative aggregate configuration owner.
 *
 * @public
 */
export interface ISkillsAssignments {
  /**
   * Saves one team's complete assignments through aggregate validation.
   *
   * @public
   */
  saveAssignments(teamId: string, assignments: readonly IAgentPhaseAssignment[]): Promise<boolean>;
  /**
   * Applies the existing built-in customization response to aggregate settings.
   *
   * @public
   */
  customizeBuiltinSkill(
    role: BuiltinSkillDto['role'],
    additionalInstructions: string,
  ): Promise<void>;
}
