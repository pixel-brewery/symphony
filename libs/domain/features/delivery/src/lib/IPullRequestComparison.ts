// #region Imports

import type { IPullRequestComparisonCommit } from './IPullRequestComparisonCommit';
import type { IPullRequestLink } from './IPullRequestLink';

// #endregion

/**
 * Comparison of two branches, shown before a pull request is opened. Providers cap the
 * commit and file detail they return, so the counts describe the comparable range only.
 *
 * @public
 */
export interface IPullRequestComparison {
  repositoryBindingId: string;
  targetBranch: string;
  sourceBranch: string;
  status: 'identical' | 'ahead' | 'behind' | 'diverged';
  aheadBy: number;
  behindBy: number;
  changedFiles: number;
  commits: readonly IPullRequestComparisonCommit[];
  /** Set when an open pull request already covers the same branch pair. */
  existingPullRequest?: IPullRequestLink;
}
