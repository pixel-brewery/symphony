// #region Imports

import type { SkillFlowRole } from '@symphony/domain-skills';

// #endregion

/**
 * The role and optional package selection consumed from a workspace team.
 *
 * @public
 */
export interface ISkillRoleAssignment {
  readonly role: SkillFlowRole;
  readonly skillId: string | null;
}
