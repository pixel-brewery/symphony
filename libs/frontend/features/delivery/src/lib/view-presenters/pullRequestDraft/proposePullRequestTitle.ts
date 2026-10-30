// #region Imports

import type { IPullRequestComparisonCommit } from '@symphony/domain-delivery';
import { readableBranchName } from './readableBranchName';

// #endregion

/**
 * Title GitHub proposes for a new pull request: a single commit contributes its own subject,
 * every other range falls back to the readable branch name.
 */
export function proposePullRequestTitle(
  sourceBranch: string,
  commits: readonly IPullRequestComparisonCommit[],
): string {
  const single = commits.length === 1 ? commits[0]?.title.trim() : undefined;
  return single || readableBranchName(sourceBranch);
}
