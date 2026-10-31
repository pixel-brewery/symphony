// #region Imports

import type { IWorkspaceAgentView } from './IWorkspaceAgentView';
import type { IWorkspacePositionView } from './IWorkspacePositionView';
import type { IWorkspaceProviderView } from './IWorkspaceProviderView';
import type { IWorkspaceRouteView } from './IWorkspaceRouteView';
import type { IWorkspaceTeamView } from './IWorkspaceTeamView';

// #endregion

export interface IWorkspaceOrganizationView {
  readonly positions: readonly IWorkspacePositionView[];
  readonly agents: readonly IWorkspaceAgentView[];
  readonly teams: readonly IWorkspaceTeamView[];
  readonly providers: readonly IWorkspaceProviderView[];
  readonly routes: readonly IWorkspaceRouteView[];
}
