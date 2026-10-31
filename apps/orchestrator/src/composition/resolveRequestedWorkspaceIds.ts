// #region Imports

import type { IApplicationSettings } from '@symphony/configuration-composition';

// #endregion

/**
 * Resolves the workspaces a scoped read covers: the one requested, which must be configured, or
 * every workspace of the active view scope.
 *
 * @param settings - Current application settings.
 * @param workspaceId - The requested workspace, if any.
 * @returns The workspace identifiers to read.
 * @public
 */
export function resolveRequestedWorkspaceIds(
  settings: Pick<IApplicationSettings, 'workspaces' | 'activeViewScope'>,
  workspaceId: string | undefined,
): readonly string[] {
  if (workspaceId === undefined) return settings.activeViewScope.workspaceIds;
  if (!settings.workspaces.some((workspace) => workspace.id === workspaceId)) {
    throw new Error('The requested workspace is not configured.');
  }
  return [workspaceId];
}
