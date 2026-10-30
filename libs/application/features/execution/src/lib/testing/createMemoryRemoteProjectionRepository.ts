// #region Imports

import type { IContinuousIntegrationProjection } from '@symphony/domain-ci';
import type { IPullRequestProjection } from '@symphony/domain-delivery';
import type { IWorkTrackingProjection } from '@symphony/domain-work';
import type { IRemoteProjectionRepository } from '@symphony/application-composition';
import type { IWorkItemDetailProjection } from '@symphony/application-work';

// #endregion

/** Creates an infrastructure-free remote projection repository for application tests. */
export function createMemoryRemoteProjectionRepository(): IRemoteProjectionRepository {
  const workTracking = new Map<string, IWorkTrackingProjection>();
  const workItemDetails = new Map<string, IWorkItemDetailProjection>();
  const pullRequests = new Map<string, IPullRequestProjection>();
  const continuousIntegration = new Map<string, IContinuousIntegrationProjection>();

  return {
    initialize: () => undefined,
    loadWorkTracking: (scope) => workTracking.get(scope),
    saveWorkTracking: (scope, projection) => workTracking.set(scope, projection),
    loadWorkItemDetail: (scope, workItemId) => workItemDetails.get(`${scope}:${workItemId}`),
    saveWorkItemDetail: (scope, projection) =>
      workItemDetails.set(`${scope}:${projection.workItem.id}`, projection),
    loadPullRequests: (scope) => pullRequests.get(scope),
    savePullRequests: (scope, projection) => pullRequests.set(scope, projection),
    loadContinuousIntegration: (scope) => continuousIntegration.get(scope),
    saveContinuousIntegration: (scope, projection) => continuousIntegration.set(scope, projection),
    removeWorkspace: (workspaceId) => {
      removeWorkspaceEntries(workTracking, workspaceId);
      removeWorkspaceEntries(workItemDetails, workspaceId);
      removeWorkspaceEntries(pullRequests, workspaceId);
      removeWorkspaceEntries(continuousIntegration, workspaceId);
    },
  };
}

function removeWorkspaceEntries<T>(entries: Map<string, T>, workspaceId: string): void {
  for (const key of entries.keys()) {
    if (key === workspaceId || key.startsWith(`${workspaceId}:`)) entries.delete(key);
  }
}
