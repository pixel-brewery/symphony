// #region Imports

import type { ISnapshotRouteStore } from './ISnapshotRouteStore';

// #endregion

export async function hydratePullRequestsRoute(
  store: Pick<ISnapshotRouteStore, 'initialize' | 'refresh' | 'refreshContinuousIntegrationRuns'>,
): Promise<void> {
  await store.initialize();
  await Promise.all([store.refresh(), store.refreshContinuousIntegrationRuns()]);
}
