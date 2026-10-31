// #region Imports

import type { IAgentPhaseAssignment } from '@symphony/domain-team';

// #endregion

/**
 * The complete new responsibilities of one AI team.
 *
 * @public
 */
export interface ISkillsTeamAssignments {
  /**
   * The team identifier.
   *
   * @public
   * @readonly
   */
  readonly teamId: string;
  /**
   * The team's complete responsibilities after the change.
   *
   * @public
   * @readonly
   */
  readonly assignments: readonly IAgentPhaseAssignment[];
}
