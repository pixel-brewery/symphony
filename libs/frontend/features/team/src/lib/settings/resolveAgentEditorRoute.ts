// #region Imports

import { inject } from '@angular/core';
import { AI_OPERATIONS } from '@symphony/frontend-core/ai';
import { ConfigurationStore } from '@symphony/frontend-core/configuration';
import type { ITeamSettingsEditorRequest } from './ITeamSettingsEditorRequest';

// #endregion

/**
 * Resolves `?workspace=<id>&agent=<id>` (with or without `section=team`) to the sheet of that
 * workspace's agent once its configuration has loaded; without the AI feature there is no sheet.
 *
 * @returns The resolver.
 * @public
 */
export function resolveAgentEditorRoute(): (
  value: string,
  workspaceId: string | undefined,
) => ITeamSettingsEditorRequest | undefined {
  const configuration = inject(ConfigurationStore);
  const ai = inject(AI_OPERATIONS, { optional: true });
  return (agentProfileId, workspaceId) => {
    if (!ai) return undefined;
    const agent = configuration
      .settings()
      ?.agentProfiles.find(
        (profile) => profile.id === agentProfileId && profile.workspaceId === workspaceId,
      );
    return agent
      ? { kind: 'ai', workspaceId: agent.workspaceId, agentProfileId: agent.id }
      : undefined;
  };
}
