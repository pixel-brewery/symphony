// #region Imports

import type { IPullRequestProjection } from '@symphony/domain-delivery';

// #endregion

/** Durable pull-request reads for one selected repository scope. */
export interface IPullRequestProjectionRepository {
  loadPullRequests(scope: string): IPullRequestProjection | undefined;
  savePullRequests(scope: string, projection: IPullRequestProjection): void;
}
