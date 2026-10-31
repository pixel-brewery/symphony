// #region Imports

import type { IAgentTeam } from '@symphony/domain-team';
import type { IApplicationSettings } from '../IApplicationSettings';
import { primaryDeliveryContext } from './primaryDeliveryContext';
import { primaryWorkspace } from './primaryWorkspace';

// #endregion

export function agentTeamFor(
  settings: IApplicationSettings,
  workspaceId?: string,
  agentTeamId?: string,
): IAgentTeam | undefined {
  if (agentTeamId) {
    return settings.agentTeams.find(
      (team) => team.id === agentTeamId && (!workspaceId || team.workspaceId === workspaceId),
    );
  }
  const context = primaryDeliveryContext(settings, workspaceId);
  if (context) return settings.agentTeams.find((team) => team.id === context.agentTeamId);
  const targetWorkspaceId = workspaceId ?? primaryWorkspace(settings)?.id;
  return settings.agentTeams.find((team) => team.workspaceId === targetWorkspaceId);
}
