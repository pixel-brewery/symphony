// #region Imports

import type { BuiltinSkillDto } from '@symphony/ipc-contracts-skills';
import type { ISkillsTeamAssignments } from './ISkillsTeamAssignments';

// #endregion

/**
 * Applies Skills mutations through the authoritative aggregate configuration owner.
 *
 * @public
 */
export interface ISkillsAssignments {
  /**
   * Saves the complete assignments of one or more teams in one aggregate settings write; declines
   * without writing when a team is unknown.
   *
   * @public
   */
  saveAssignments(changes: readonly ISkillsTeamAssignments[]): Promise<boolean>;
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
