// #region Imports

import type { IPullRequestSummary } from '@symphony/domain-delivery';

// #endregion

/** Lists pull requests independently from Symphony execution history. */
export interface IPullRequestCollectionPort {
  listPullRequests(): Promise<readonly IPullRequestSummary[]>;
}
