// #region Imports

import type { IAgentPhaseAssignment } from './IAgentPhaseAssignment';

// #endregion

export interface IAgentTeam {
  id: string;
  workspaceId: string;
  displayName: string;
  description: string;
  assignments: readonly IAgentPhaseAssignment[];
}
