// #region Imports

import type { IApplicationSettings } from '../IApplicationSettings';
import type { IWorkspaceDefinition } from '@symphony/domain-workspace';

// #endregion

export function selectedWorkspaces(
  settings: IApplicationSettings,
): readonly IWorkspaceDefinition[] {
  const selectedIds = new Set(settings.activeViewScope.workspaceIds);
  return settings.workspaces.filter(
    (workspace) => workspace.enabled && selectedIds.has(workspace.id),
  );
}
