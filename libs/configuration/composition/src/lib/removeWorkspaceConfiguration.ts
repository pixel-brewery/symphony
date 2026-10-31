// #region Imports

import type { IApplicationSettings } from './IApplicationSettings';
import { applicationSettingsSchema } from './application-settings/ApplicationSettingsSchema';

// #endregion

/** Removes one workspace and every configuration record owned by that workspace. */
export function removeWorkspaceConfiguration(
  settings: IApplicationSettings,
  workspaceId: string,
): IApplicationSettings {
  if (!settings.workspaces.some((workspace) => workspace.id === workspaceId)) {
    throw new Error(`Unknown workspace: ${workspaceId}`);
  }
  if (settings.workspaces.length === 1) {
    throw new Error('The last workspace cannot be deleted. Create another workspace first.');
  }

  const workspaces = settings.workspaces.filter((workspace) => workspace.id !== workspaceId);
  const fallbackWorkspace = workspaces.find((workspace) => workspace.enabled);
  if (!fallbackWorkspace) {
    throw new Error('Enable another workspace before deleting this workspace.');
  }

  const savedViews = settings.savedViews.flatMap((view) => {
    const workspaceIds = view.workspaceIds.filter((id) => id !== workspaceId);
    return workspaceIds.length ? [{ ...view, workspaceIds }] : [];
  });
  const activeWorkspaceIds = settings.activeViewScope.workspaceIds.filter(
    (id) => id !== workspaceId,
  );
  const activeViewWorkspaceIds = activeWorkspaceIds.length
    ? activeWorkspaceIds
    : [fallbackWorkspace.id];
  const savedViewId = savedViews.some((view) => view.id === settings.activeViewScope.savedViewId)
    ? settings.activeViewScope.savedViewId
    : undefined;

  return applicationSettingsSchema.parse({
    ...settings,
    workspaces,
    connections: settings.connections.filter(
      (connection) => connection.workspaceId !== workspaceId,
    ),
    workItemSources: settings.workItemSources.filter(
      (source) => source.workspaceId !== workspaceId,
    ),
    repositoryBindings: settings.repositoryBindings.filter(
      (repository) => repository.workspaceId !== workspaceId,
    ),
    deliveryTargets: (settings.deliveryTargets ?? []).filter(
      (target) => target.workspaceId !== workspaceId,
    ),
    ciBindings: settings.ciBindings.filter((binding) => binding.workspaceId !== workspaceId),
    positions: settings.positions.filter((position) => position.workspaceId !== workspaceId),
    providerManifests: settings.providerManifests.filter(
      (manifest) => manifest.workspaceId !== workspaceId,
    ),
    agentRoutePolicies: settings.agentRoutePolicies.filter(
      (policy) => policy.workspaceId !== workspaceId,
    ),
    agentProfiles: settings.agentProfiles.filter((profile) => profile.workspaceId !== workspaceId),
    agentTeams: settings.agentTeams.filter((team) => team.workspaceId !== workspaceId),
    deliveryContexts: settings.deliveryContexts.filter(
      (context) => context.workspaceId !== workspaceId,
    ),
    feedbackIntakeSources: settings.feedbackIntakeSources.filter(
      (source) => source.workspaceId !== workspaceId,
    ),
    savedViews,
    activeViewScope: {
      ...settings.activeViewScope,
      workspaceIds: activeViewWorkspaceIds,
      savedViewId,
      workItemSourceId: settings.workItemSources.some(
        (source) =>
          source.id === settings.activeViewScope.workItemSourceId &&
          source.workspaceId !== workspaceId,
      )
        ? settings.activeViewScope.workItemSourceId
        : undefined,
    },
  });
}
