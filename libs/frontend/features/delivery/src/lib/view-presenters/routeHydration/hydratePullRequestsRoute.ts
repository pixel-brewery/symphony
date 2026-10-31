// #region Imports

import type { ISnapshotRouteStore } from './ISnapshotRouteStore';

// #endregion

/**
 * Loads the data of the `Pull requests` screen: the application snapshot first, then the workflow
 * runs. The runs are applied last because a snapshot refresh replaces the whole projection and
 * would otherwise overwrite the fresher runs the checks of each pull request are read from.
 *
 * @param store - The snapshot and CI owners.
 * @public
 */
export async function hydratePullRequestsRoute(
  store: Pick<ISnapshotRouteStore, 'initialize' | 'refresh' | 'refreshContinuousIntegrationRuns'>,
): Promise<void> {
  await store.initialize();
  await store.refresh();
  await store.refreshContinuousIntegrationRuns();
}
