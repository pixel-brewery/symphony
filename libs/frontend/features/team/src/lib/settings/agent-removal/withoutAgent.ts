// #region Imports

import type { Settings } from './Settings';

// #endregion

/**
 * Settings without the agent. Its position and route policy are dropped when no other agent uses
 * them, and every team assignment it owned moves to an agent whose position allows that role.
 */
export function withoutAgent(settings: Settings, agentId: string): Settings {
  const profile = settings.agentProfiles.find((candidate) => candidate.id === agentId);
  if (!profile) return settings;
  const agentProfiles = settings.agentProfiles.filter((candidate) => candidate.id !== agentId);
  const positionsById = new Map(settings.positions.map((position) => [position.id, position]));
  const allowsRole = (candidateId: string, role: SkillFlowRole, workspaceId: string): boolean => {
    const candidate = agentProfiles.find((item) => item.id === candidateId);
    if (!candidate || candidate.workspaceId !== workspaceId || !candidate.enabled) return false;
    return positionsById.get(candidate.positionId)?.allowedRoles.includes(role) === true;
  };
  return {
    ...settings,
    agentProfiles,
    positions: agentProfiles.some((candidate) => candidate.positionId === profile.positionId)
      ? settings.positions
      : settings.positions.filter((position) => position.id !== profile.positionId),
    agentRoutePolicies: agentProfiles.some(
      (candidate) => candidate.routePolicyId === profile.routePolicyId,
    )
      ? settings.agentRoutePolicies
      : settings.agentRoutePolicies.filter((policy) => policy.id !== profile.routePolicyId),
    agentTeams: settings.agentTeams.map((team) => ({
      ...team,
      assignments: team.assignments.flatMap((assignment) => {
        const fallbackAgentIds = assignment.fallbackAgentIds.filter(
          (candidate) => candidate !== agentId,
        );
        if (assignment.primaryAgentId !== agentId) return [{ ...assignment, fallbackAgentIds }];
        const replacement =
          fallbackAgentIds.find((candidate) =>
            allowsRole(candidate, assignment.role, team.workspaceId),
          ) ??
          agentProfiles.find((candidate) =>
            allowsRole(candidate.id, assignment.role, team.workspaceId),
          )?.id;
        if (!replacement) return [];
        return [
          {
            ...assignment,
            primaryAgentId: replacement,
            fallbackAgentIds: fallbackAgentIds.filter((candidate) => candidate !== replacement),
          },
        ];
      }),
    })),
  };
}

type SkillFlowRole = Settings['positions'][number]['allowedRoles'][number];
