// #region Imports

import { skillFlowRoles } from '@symphony/domain-skills';
import type { IWorkspaceOrganizationView } from './IWorkspaceOrganizationView';
import type { Settings } from './Settings';

// #endregion

export function projectWorkspaceOrganization(
  settings: Settings,
  workspaceId: string,
): IWorkspaceOrganizationView {
  const positions = settings.positions.filter((item) => item.workspaceId === workspaceId);
  const routes = settings.agentRoutePolicies.filter((item) => item.workspaceId === workspaceId);
  const agents = settings.agentProfiles.filter((item) => item.workspaceId === workspaceId);
  const teams = settings.agentTeams.filter((item) => item.workspaceId === workspaceId);
  const positionsById = new Map(positions.map((item) => [item.id, item]));
  const routesById = new Map(routes.map((item) => [item.id, item]));
  const agentsById = new Map(agents.map((item) => [item.id, item]));

  // Agents are listed in skill-flow order (create tickets → … → review changes), mirroring the
  // "Who does what" section: primary assignees rank before backups of the same role, unassigned
  // agents keep their stored order at the end.
  const primaryRoleRankByAgentId = new Map<string, number>();
  const fallbackRoleRankByAgentId = new Map<string, number>();
  const keepLowestRank = (ranks: Map<string, number>, agentId: string, rank: number): void => {
    const current = ranks.get(agentId);
    if (current === undefined || rank < current) {
      ranks.set(agentId, rank);
    }
  };
  for (const team of teams) {
    for (const assignment of team.assignments) {
      const roleIndex = skillFlowRoles.indexOf(assignment.role);
      const roleRank = roleIndex < 0 ? skillFlowRoles.length : roleIndex;
      keepLowestRank(primaryRoleRankByAgentId, assignment.primaryAgentId, roleRank);
      for (const fallbackAgentId of assignment.fallbackAgentIds) {
        keepLowestRank(fallbackRoleRankByAgentId, fallbackAgentId, roleRank);
      }
    }
  }
  const agentSortKey = (agentId: string): readonly [number, number] => {
    const primaryRank = primaryRoleRankByAgentId.get(agentId);
    if (primaryRank !== undefined) {
      return [primaryRank, 0];
    }
    const fallbackRank = fallbackRoleRankByAgentId.get(agentId);
    if (fallbackRank !== undefined) {
      return [fallbackRank, 1];
    }
    return [skillFlowRoles.length, 2];
  };
  const orderedAgents = [...agents].sort((left, right) => {
    const [leftRole, leftKind] = agentSortKey(left.id);
    const [rightRole, rightKind] = agentSortKey(right.id);
    return leftRole - rightRole || leftKind - rightKind;
  });
  const connectionsById = new Map(
    settings.connections
      .filter((item) => item.workspaceId === workspaceId)
      .map((item) => [item.id, item]),
  );

  return {
    positions: positions.map((position) => ({
      id: position.id,
      displayName: position.displayName,
      description: position.description,
      authority: position.authority,
      allowedRoles: position.allowedRoles,
      responsibilities: position.responsibilities,
    })),
    agents: orderedAgents.map((agent) => {
      const position = positionsById.get(agent.positionId);
      const route = routesById.get(agent.routePolicyId);
      const accountId = route?.candidates
        .filter((candidate) => candidate.enabled)
        .sort((left, right) => left.priority - right.priority)[0]?.aiConnectionId;
      const candidate = route?.candidates
        .filter((item) => item.enabled)
        .sort((left, right) => left.priority - right.priority)[0];
      const connection = accountId ? connectionsById.get(accountId) : undefined;
      const accountKind =
        connection?.kind === 'codex' ||
        connection?.kind === 'claude' ||
        connection?.kind === 'opencode'
          ? connection.kind
          : undefined;
      return {
        id: agent.id,
        displayName: agent.displayName,
        ...(agent.appearance ? { appearance: agent.appearance } : {}),
        positionDisplayName: position?.displayName ?? 'Position unavailable',
        positionDescription: position?.description,
        enabled: agent.enabled,
        ...(accountId ? { accountId } : {}),
        ...(accountKind ? { accountKind } : {}),
        ...(connection ? { accountDisplayName: connection.displayName } : {}),
        ...(candidate?.model ? { model: candidate.model } : {}),
        ...(candidate?.reasoningEffort ? { reasoningEffort: candidate.reasoningEffort } : {}),
        fallbacks: (route?.candidates ?? [])
          .filter((item) => item.enabled && item.aiConnectionId !== accountId)
          .sort((left, right) => left.priority - right.priority)
          .flatMap((item) => {
            const fallbackConnection = connectionsById.get(item.aiConnectionId);
            if (
              fallbackConnection?.kind !== 'codex' &&
              fallbackConnection?.kind !== 'claude' &&
              fallbackConnection?.kind !== 'opencode'
            ) {
              return [];
            }
            return [
              {
                accountId: item.aiConnectionId,
                accountDisplayName: fallbackConnection.displayName,
                accountKind: fallbackConnection.kind,
                ...(item.model ? { model: item.model } : {}),
                ...(item.reasoningEffort ? { reasoningEffort: item.reasoningEffort } : {}),
              },
            ];
          }),
      };
    }),
    teams: teams.map((team) => ({
      id: team.id,
      displayName: team.displayName,
      description: team.description,
      assignments: team.assignments.map((assignment) => {
        return {
          role: assignment.role,
          primaryAgentDisplayName:
            agentsById.get(assignment.primaryAgentId)?.displayName ?? 'Unavailable',
          skillId: assignment.skillId,
          fallbackAgentDisplayNames: assignment.fallbackAgentIds.map(
            (agentId) => agentsById.get(agentId)?.displayName ?? 'Unavailable',
          ),
        };
      }),
    })),
    providers: (settings.providerManifests ?? [])
      .filter((manifest) => manifest.workspaceId === workspaceId)
      .map((manifest) => ({
        id: manifest.id,
        displayName: manifest.displayName,
        providerId: manifest.providerId,
        runtime: manifest.runtime,
        protocol: manifest.protocol,
        modelDiscovery: manifest.modelDiscovery,
        capabilities: manifest.capabilities,
      })),
    routes: routes.map((route) => ({
      id: route.id,
      displayName: route.displayName,
      strategy: route.strategy,
      costPolicy: route.costPolicy,
      sessionAffinity: route.sessionAffinity,
      maxParallelExecutions: route.maxParallelExecutions,
      candidates: [...route.candidates]
        .sort((left, right) => left.priority - right.priority)
        .map((candidate) => {
          const account = connectionsById.get(candidate.aiConnectionId);
          return {
            id: candidate.id,
            priority: candidate.priority,
            displayName: account?.displayName ?? 'Unavailable account',
            accountProvider: account?.kind,
            providerId: candidate.providerId ?? account?.kind ?? 'unavailable',
            model: candidate.model,
            reasoningEffort: candidate.reasoningEffort,
            qualityScore: candidate.qualityScore ?? 50,
            costClass: candidate.costClass,
            enabled: candidate.enabled,
          };
        }),
    })),
  };
}
