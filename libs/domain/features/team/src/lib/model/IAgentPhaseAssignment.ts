// #region Imports

import type { SkillFlowRole } from '@symphony/domain-skills';

// #endregion

export interface IAgentPhaseAssignment {
  role: SkillFlowRole;
  primaryAgentId: string;
  fallbackAgentIds: readonly string[];
  skillId: string | null;
}
