// #region Imports

import type { IPullRequestSummary } from './IPullRequestSummary';

// #endregion

/**
 * Provider-neutral pull requests visible in a workspace selection.
 *
 * @public
 */
export interface IPullRequestProjection {
  version: 1;
  workspaceIds: readonly string[];
  pullRequests: readonly IPullRequestSummary[];
  refreshedAt: string;
}
