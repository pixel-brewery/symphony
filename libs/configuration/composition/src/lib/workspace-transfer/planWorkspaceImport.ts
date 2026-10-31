// #region Imports

import type { IApplicationSettings } from '../IApplicationSettings';
import { applicationSettingsSchema } from '../application-settings/ApplicationSettingsSchema';
import type { IWorkspaceImportPlan } from './IWorkspaceImportPlan';
import type { WorkspaceBundle } from './WorkspaceBundle';
import { workspaceBundleSchema } from './WorkspaceBundleSchema';

// #endregion

export function planWorkspaceImport(
  current: IApplicationSettings,
  input: WorkspaceBundle,
  repositoryPath: (repositoryId: string) => string,
): IWorkspaceImportPlan {
  const bundle = workspaceBundleSchema.parse(input);
  const workspaceId = bundle.workspace.id;
  const existingPaths = new Map(
    current.repositoryBindings
      .filter((binding) => binding.workspaceId === workspaceId)
      .map((binding) => [binding.id, binding.localPath]),
  );
  const replaceOwned = <T extends { readonly workspaceId: string }>(
    currentRecords: readonly T[],
    importedRecords: readonly T[],
  ): T[] => [
    ...currentRecords.filter((record) => record.workspaceId !== workspaceId),
    ...importedRecords,
  ];
  const repositoryBindings = bundle.repositoryBindings.map((binding) => ({
    ...binding,
    localPath: existingPaths.get(binding.id) ?? repositoryPath(binding.id),
  }));
  const workspaces = [
    ...current.workspaces.filter((workspace) => workspace.id !== workspaceId),
    bundle.workspace,
  ];
  const enabledWorkspaceIds = new Set(
    workspaces.filter((workspace) => workspace.enabled).map((workspace) => workspace.id),
  );
  const retainedActiveWorkspaceIds = current.activeViewScope.workspaceIds.filter((id) =>
    enabledWorkspaceIds.has(id),
  );
  if (!bundle.workspace.enabled && retainedActiveWorkspaceIds.length === 0) {
    throw new Error(
      `Cannot import disabled workspace ${workspaceId} because no enabled workspace would remain selected.`,
    );
  }
  const merged = applicationSettingsSchema.parse({
    ...current,
    activeViewScope: bundle.workspace.enabled
      ? { workspaceIds: [workspaceId], boardLayout: current.activeViewScope.boardLayout }
      : {
          workspaceIds: retainedActiveWorkspaceIds,
          boardLayout: current.activeViewScope.boardLayout,
        },
    workspaces,
    connections: replaceOwned(current.connections, bundle.connections),
    workItemSources: replaceOwned(current.workItemSources, bundle.workItemSources),
    repositoryBindings: replaceOwned(current.repositoryBindings, repositoryBindings),
    ciBindings: replaceOwned(current.ciBindings, bundle.ciBindings),
    positions: replaceOwned(current.positions, bundle.positions),
    providerManifests: replaceOwned(current.providerManifests, bundle.providerManifests),
    agentRoutePolicies: replaceOwned(current.agentRoutePolicies, bundle.agentRoutePolicies),
    agentProfiles: replaceOwned(current.agentProfiles, bundle.agentProfiles),
    agentTeams: replaceOwned(current.agentTeams, bundle.agentTeams),
    deliveryContexts: replaceOwned(current.deliveryContexts, bundle.deliveryContexts),
    feedbackIntakeSources: replaceOwned(
      current.feedbackIntakeSources,
      bundle.feedbackIntakeSources,
    ),
  });
  return {
    settings: merged,
    workspaceId,
    workspaceName: bundle.workspace.displayName,
    replaced: current.workspaces.some((workspace) => workspace.id === workspaceId),
    requiredConnectionIds: bundle.connections.map((connection) => connection.id),
    repositoryBindingIds: repositoryBindings.map((binding) => binding.id),
    skills: bundle.skills,
  };
}
