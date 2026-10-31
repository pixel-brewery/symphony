// #region Imports

import type { PullRequestBaseBranchStatus } from './PullRequestBaseBranchStatus';

// #endregion

/**
 * Observed pull-request state and source-control branch qualification.
 *
 * @public
 */
export interface IPullRequestStatus {
  state: 'open' | 'closed' | 'merged';
  draft: boolean;
  /** Head commit at inspection time; verification verdicts bind to it. */
  headCommitSha?: string;
  /** Provider-neutral relationship between the pull-request head and its configured base. */
  baseBranchStatus?: PullRequestBaseBranchStatus;
  /** Source branch reported by the provider; managed updates must match the retained workspace. */
  sourceBranch?: string;
  /** Target branch reported by the provider. */
  targetBranch?: string;
}
