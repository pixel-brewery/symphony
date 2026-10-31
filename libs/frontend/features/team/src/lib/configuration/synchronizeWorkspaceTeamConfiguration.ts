// #region Imports

import { upsertSettingsItem } from '@symphony/frontend-setting';
import { skillFlowRoles, type SkillFlowRole } from '@symphony/domain-skills';
import type { ApplicationSettingsDto } from '@symphony/ipc-contracts-composition';

// #endregion

type Settings = ApplicationSettingsDto;

/** Reconciles workspace team assignments and delivery scope using the existing validated settings transaction. @public */
export function synchronizeWorkspaceTeamConfiguration(
  settings: Settings,
  workspaceId: string,
  preferredProfileId?: string,
  preferredRoles: readonly SkillFlowRole[] = skillFlowRoles,
  preferredSkillIds: Partial<Record<SkillFlowRole, string>> = {},
): Settings {
  const profiles = settings.agentProfiles.filter(
    (item) => item.workspaceId === workspaceId && item.enabled,
  );
  const profileId = preferredProfileId ?? profiles[0]?.id;
  if (!profileId) return settings;
  const sources = settings.workItemSources.filter(
    (item) => item.workspaceId === workspaceId && item.enabled,
  );
  const repositories = settings.repositoryBindings.filter(
    (item) => item.workspaceId === workspaceId && item.enabled,
  );
  const ci = settings.ciBindings.filter((item) => item.workspaceId === workspaceId && item.enabled);
  const existing = settings.deliveryContexts.find(
    (item) => item.workspaceId === workspaceId && item.enabled,
  );
  const existingTeam =
    settings.agentTeams.find((team) => team.id === existing?.agentTeamId) ??
    settings.agentTeams.find((team) => team.workspaceId === workspaceId);
  const team: Settings['agentTeams'][number] = {
    id: existingTeam?.id ?? `team-${crypto.randomUUID()}`,
    workspaceId,
    displayName: existingTeam?.displayName ?? 'Default delivery team',
    description: existingTeam?.description ?? 'Routes delivery phases to configured AI agents.',
    assignments: skillFlowRoles.flatMap((role) => {
      const assignment = existingTeam?.assignments.find((candidate) => candidate.role === role);
      const assignsPreferredProfile =
        preferredProfileId !== undefined && preferredRoles.includes(role);
      const allowsRole = (agentId: string) => {
        const agent = profiles.find((candidate) => candidate.id === agentId);
        const position = settings.positions.find((candidate) => candidate.id === agent?.positionId);
        return position?.allowedRoles.includes(role) === true;
      };
      const retainedPrimary = assignment
        ? [assignment.primaryAgentId, ...assignment.fallbackAgentIds].find(
            (agentId) => agentId !== preferredProfileId && allowsRole(agentId),
          )
        : undefined;
      const primaryAgentId = assignsPreferredProfile
        ? preferredProfileId
        : assignment?.primaryAgentId !== preferredProfileId &&
            assignment?.primaryAgentId &&
            allowsRole(assignment.primaryAgentId)
          ? assignment.primaryAgentId
          : retainedPrimary;
      if (!primaryAgentId) return [];
      const fallbackAgentIds = [
        ...(assignsPreferredProfile &&
        assignment?.primaryAgentId &&
        assignment.primaryAgentId !== primaryAgentId
          ? [assignment.primaryAgentId]
          : []),
        ...(assignment?.fallbackAgentIds ?? []),
      ].filter(
        (agentId, index, items) =>
          agentId !== primaryAgentId && allowsRole(agentId) && items.indexOf(agentId) === index,
      );
      return [
        {
          role,
          primaryAgentId,
          fallbackAgentIds,
          skillId: assignsPreferredProfile
            ? (preferredSkillIds[role] ?? assignment?.skillId ?? null)
            : (assignment?.skillId ?? null),
        },
      ];
    }),
  };
  const context: Settings['deliveryContexts'][number] = {
    id: existing?.id ?? `context-${crypto.randomUUID()}`,
    workspaceId,
    displayName:
      settings.workspaces.find((item) => item.id === workspaceId)?.displayName ??
      'Delivery context',
    workItemSourceIds: sources.map((item) => item.id),
    repositoryBindingIds: repositories.map((item) => item.id),
    ciBindingIds: ci.map((item) => item.id),
    agentTeamId: team.id,
    ...(repositories[0] ? { defaultRepositoryBindingId: repositories[0].id } : {}),
    enabled: true,
  };
  return {
    ...settings,
    agentTeams: upsertSettingsItem(settings.agentTeams, team),
    deliveryContexts: upsertSettingsItem(settings.deliveryContexts, context),
  };
}
