// #region Imports

import type { IAgentProfile } from '@symphony/domain-team';
import type { IApplicationSettings } from '../IApplicationSettings';
import type { ProviderConnection } from '../ProviderConnection';
import type { SkillFlowRole } from '@symphony/domain-skills';
import type { IAgentExecutionTarget } from './IAgentExecutionTarget';
import { agentTeamFor } from './agentTeamFor';

// #endregion

export function agentExecutionTargetsFor(
  settings: IApplicationSettings,
  role: SkillFlowRole,
  workspaceId?: string,
  agentTeamId?: string,
): readonly IAgentExecutionTarget[] {
  const team = agentTeamFor(settings, workspaceId, agentTeamId);
  const assignment = team?.assignments.find((candidate) => candidate.role === role);
  if (!team || !assignment) return [];
  return [assignment.primaryAgentId, ...assignment.fallbackAgentIds]
    .map((agentId) => settings.agentProfiles.find((candidate) => candidate.id === agentId))
    .filter(
      (agent): agent is IAgentProfile =>
        agent?.enabled === true && agent.workspaceId === team.workspaceId,
    )
    .flatMap((agent) => {
      const position = settings.positions.find(
        (candidate) =>
          candidate.id === agent.positionId && candidate.workspaceId === team.workspaceId,
      );
      const routePolicy = settings.agentRoutePolicies.find(
        (candidate) =>
          candidate.id === agent.routePolicyId && candidate.workspaceId === team.workspaceId,
      );
      if (!position || !routePolicy || !position.allowedRoles.includes(role)) return [];
      if ((role === 'solution' || role === 'ci-repair') && position.authority !== 'worktree-write')
        return [];
      const eligibleCostClasses =
        routePolicy.costPolicy === 'free-only'
          ? new Set(['free-tier', 'local'])
          : routePolicy.costPolicy === 'local-only'
            ? new Set(['local'])
            : undefined;
      return [...routePolicy.candidates]
        .filter(
          (candidate) =>
            candidate.enabled &&
            (!eligibleCostClasses || eligibleCostClasses.has(candidate.costClass)) &&
            (position.requiredCapabilities ?? []).every((capability) =>
              (candidate.capabilities ?? []).includes(capability),
            ),
        )
        .sort((left, right) => left.priority - right.priority)
        .flatMap((routeCandidate) => {
          const connection = settings.connections.find(
            (
              candidate,
            ): candidate is Extract<
              ProviderConnection,
              { kind: 'codex' | 'claude' | 'opencode' }
            > =>
              candidate.id === routeCandidate.aiConnectionId &&
              candidate.workspaceId === team.workspaceId &&
              (candidate.kind === 'codex' ||
                candidate.kind === 'claude' ||
                candidate.kind === 'opencode'),
          );
          return connection
            ? [{ team, assignment, agent, position, routePolicy, routeCandidate, connection }]
            : [];
        });
    });
}
