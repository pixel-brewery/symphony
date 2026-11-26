// #region Imports
import type { IApplicationSettings } from '@symphony/configuration-composition';
import {
  mobileDisplaySettingsSchema,
  type IMobileDisplaySettings,
} from '@symphony/mobile-contracts';
// #endregion

/**
 * Selects only operational display values for the active workspace scope.
 *
 * @param settings - Host-private canonical settings, never serialized or spread into the result.
 * @returns Strict read-only configuration without provider credentials, local paths or provisioning.
 * @public
 */
export function projectMobileDisplaySettings(
  settings: IApplicationSettings,
): IMobileDisplaySettings {
  const selected = new Set(settings.activeViewScope.workspaceIds);
  return mobileDisplaySettingsSchema.parse({
    version: 1,
    activeViewScope: {
      workspaceIds: [...settings.activeViewScope.workspaceIds],
      boardLayout: settings.activeViewScope.boardLayout,
      ...(settings.activeViewScope.savedViewId
        ? { savedViewId: settings.activeViewScope.savedViewId }
        : {}),
      ...(settings.activeViewScope.workItemSourceId
        ? { workItemSourceId: settings.activeViewScope.workItemSourceId }
        : {}),
    },
    workspaces: settings.workspaces
      .filter((item) => selected.has(item.id))
      .map((item) => ({
        id: item.id,
        displayName: item.displayName,
        shortCode: item.shortCode,
        color: item.color,
        ...(item.avatar ? { avatar: item.avatar } : {}),
        enabled: item.enabled,
      })),
    repositories: settings.repositoryBindings
      .filter((item) => selected.has(item.workspaceId))
      .map((item) => ({
        id: item.id,
        workspaceId: item.workspaceId,
        displayName: item.displayName,
        provider: item.provider,
        host: item.host,
        owner: item.owner,
        name: item.name,
        defaultBranch: item.defaultBranch,
        enabled: item.enabled,
      })),
    workItemSources: settings.workItemSources
      .filter((item) => selected.has(item.workspaceId))
      .map((item) => ({
        id: item.id,
        workspaceId: item.workspaceId,
        provider: item.provider,
        displayName: item.displayName,
        enabled: item.enabled,
      })),
    employees: settings.agentProfiles
      .filter((item) => selected.has(item.workspaceId))
      .map((item) => ({
        id: item.id,
        workspaceId: item.workspaceId,
        displayName: item.displayName,
        positionId: item.positionId,
        appearance: item.appearance,
        enabled: item.enabled,
      })),
    workflowStages: settings.workflow.stages.map((stage) => ({
      id: stage.id,
      label: stage.label,
      description: stage.description,
      kind: stage.kind,
    })),
    automaticExecutionEnabled: settings.runtime.automaticExecutionEnabled,
  });
}
