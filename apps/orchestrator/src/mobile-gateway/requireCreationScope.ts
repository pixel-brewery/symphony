// #region Imports

import type { ISymphonyMobileApplicationDependencies } from './interfaces/ISymphonyMobileApplicationDependencies';

// #endregion

/**
 * Rejects creation metadata that no longer belongs to the selected workspace and repository.
 *
 * @param context - Current host-owned creation scope and allowed repository metadata.
 * @param workspaceId - Workspace selected by the submitted product request.
 * @param repository - Repository selected from the current form.
 * @returns Returns when the submitted workspace and repository remain in the current creation scope.
 * @throws Error when the active workspace or repository admission has changed.
 * @public
 */
export function requireCreationScope(
  context: Awaited<ReturnType<ISymphonyMobileApplicationDependencies['workItemCreationContext']>>,
  workspaceId: string,
  repository: string,
): void {
  if (context.workspaceId !== workspaceId) {
    throw new Error('The selected workspace is no longer active. Reload the work-item form.');
  }
  if (!context.metadata.repositories.includes(repository)) {
    throw new Error('The selected repository is no longer available. Reload the work-item form.');
  }
}
