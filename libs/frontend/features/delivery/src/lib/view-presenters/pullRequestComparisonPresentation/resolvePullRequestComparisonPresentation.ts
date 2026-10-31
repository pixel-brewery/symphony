// #region Imports

import type { IPullRequestComparison } from '@symphony/domain-delivery';
import type { IPullRequestComparisonPresentation } from './IPullRequestComparisonPresentation';

// #endregion

/**
 * Turns a branch comparison into the decision GitHub shows above the pull-request form: whether
 * the range can become a pull request at all, and what would enter the target branch.
 */
export function resolvePullRequestComparisonPresentation(
  comparison: IPullRequestComparison,
): IPullRequestComparisonPresentation {
  if (comparison.existingPullRequest) {
    return {
      variant: 'warning',
      iconName: 'errorCircle',
      header: 'A pull request already exists',
      detail: `Pull request #${comparison.existingPullRequest.number} already merges ${comparison.sourceBranch} into ${comparison.targetBranch}.`,
      comparable: false,
    };
  }
  if (comparison.aheadBy === 0) {
    return {
      variant: 'neutral',
      iconName: 'info',
      header: "There isn't anything to compare",
      detail:
        comparison.behindBy === 0
          ? `${comparison.targetBranch} and ${comparison.sourceBranch} are identical.`
          : `${comparison.sourceBranch} is ${countLabel(comparison.behindBy, 'commit')} behind ${comparison.targetBranch} and carries nothing new.`,
      comparable: false,
    };
  }
  const carried = `${countLabel(comparison.aheadBy, 'commit')} and ${countLabel(comparison.changedFiles, 'changed file')} would enter ${comparison.targetBranch}.`;
  if (comparison.status === 'diverged') {
    return {
      variant: 'warning',
      iconName: 'errorCircle',
      header: 'Both branches moved on',
      detail: `${carried} ${comparison.targetBranch} is ${countLabel(comparison.behindBy, 'commit')} ahead as well, so GitHub decides whether the merge stays clean.`,
      comparable: true,
    };
  }
  return {
    variant: 'success',
    iconName: 'checkmark',
    header: 'Able to merge',
    detail: carried,
    comparable: true,
  };
}

function countLabel(count: number, singular: string): string {
  return `${count} ${count === 1 ? singular : `${singular}s`}`;
}
