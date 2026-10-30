// #region Imports

import type { AgentRemovalBlocker } from './AgentRemovalBlocker';
import type { Settings } from './Settings';
import { withoutAgent } from './withoutAgent';

// #endregion

export function agentRemovalBlockers(
  settings: Settings,
  agentId: string,
): readonly AgentRemovalBlocker[] {
  const profile = settings.agentProfiles.find((candidate) => candidate.id === agentId);
  if (!profile) return [];
  const siblings = settings.agentProfiles.filter(
    (candidate) => candidate.workspaceId === profile.workspaceId && candidate.id !== agentId,
  );
  if (!siblings.length) return ['last-agent'];
  const next = withoutAgent(settings, agentId);
  const intakeNeedsCreator = settings.feedbackIntakeSources.some(
    (source) => source.enabled && source.workspaceId === profile.workspaceId,
  );
  const keepsCreator = next.deliveryContexts.some((context) => {
    if (!context.enabled || context.workspaceId !== profile.workspaceId) return false;
    return next.agentTeams
      .find((team) => team.id === context.agentTeamId)
      ?.assignments.some(
        (assignment) => assignment.role === 'work-item-creation' && assignment.skillId !== null,
      );
  });
  return intakeNeedsCreator && !keepsCreator ? ['work-item-creation'] : [];
}
