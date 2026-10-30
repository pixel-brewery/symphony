// #region Imports

import type { IWorkspaceTeamAssignmentView } from './IWorkspaceTeamAssignmentView';

// #endregion

export interface IWorkspaceTeamView {
  readonly id: string;
  readonly displayName: string;
  readonly description: string;
  readonly assignments: readonly IWorkspaceTeamAssignmentView[];
}
