// #region Imports

import type { SkillFlowRole } from './SkillFlowRole';

// #endregion

export interface IWorkspaceTeamAssignmentView {
  readonly role: SkillFlowRole;
  readonly primaryAgentDisplayName: string;
  readonly skillId: string | null;
  readonly fallbackAgentDisplayNames: readonly string[];
}
