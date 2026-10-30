// #region Imports

import type { ILocalMobileGatewayDependencies } from './ILocalMobileGatewayDependencies';

// #endregion

export function requireCreationScope(
  context: Awaited<ReturnType<ILocalMobileGatewayDependencies['workItemCreationContext']>>,
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
