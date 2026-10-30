// #region Imports

import { effect, inject, untracked } from '@angular/core';
import { ConfigurationStore } from '@symphony/frontend-core/configuration';
import { AI_OPERATIONS } from '@symphony/frontend-core/ai';
import type { ISettingsRouteContext } from '@symphony/frontend-setting';

// #endregion

/**
 * Opens an existing bookmarked agent once after its authoritative workspace configuration loads.
 *
 * @public
 */
export function initializeTeamSettingsRoute(context: ISettingsRouteContext): void {
  const configuration = inject(ConfigurationStore);
  const ai = inject(AI_OPERATIONS, { optional: true });
  let requestedAgentEditorKey = '';
  effect(() => {
    const parameters = context.parameters();
    const workspaceId = parameters.get('workspace');
    const agentProfileId = parameters.get('agent');
    const agent = configuration
      .settings()
      ?.agentProfiles.find(
        (profile) => profile.id === agentProfileId && profile.workspaceId === workspaceId,
      );
    if (!agent) return;
    const key = `${agent.workspaceId}:${agent.id}`;
    if (key === requestedAgentEditorKey) return;
    requestedAgentEditorKey = key;
    untracked(() => {
      context.session.openWorkspace(agent.workspaceId, 'team');
      if (ai)
        context.openEditor({
          kind: 'ai',
          workspaceId: agent.workspaceId,
          agentProfileId: agent.id,
        });
    });
  });
}
