// #region Imports

import type { PullRequestBaseBranchStatus } from './PullRequestBaseBranchStatus';

// #endregion

/**
 * Provider-neutral summary of a pull request visible in the selected workspace scope.
 *
 * @public
 */
export interface IPullRequestSummary {
  id: string;
  workspaceId: string;
  repositoryBindingId: string;
  number: number;
  title: string;
  state: 'open' | 'closed' | 'merged';
  draft: boolean;
  author?: string;
  sourceBranch: string;
  targetBranch: string;
  /** Provider-confirmed revisions used to associate CI without guessing branch names. */
  headRevision?: string;
  mergeRevision?: string;
  /** Last cycle-observed base-branch qualification for Symphony-managed pull requests; may be absent. */
  baseBranchStatus?: PullRequestBaseBranchStatus;
  /**
   * Logins of the people whose review is requested and still pending, as the provider reports
   * them; absent when the provider reports no pending request.
   */
  requestedReviewers?: readonly string[];
  /** Teams whose review is requested and still pending (`organization/team`); absent when none. */
  requestedTeams?: readonly string[];
  externalUrl: string;
  createdAt: string;
  updatedAt: string;
}
