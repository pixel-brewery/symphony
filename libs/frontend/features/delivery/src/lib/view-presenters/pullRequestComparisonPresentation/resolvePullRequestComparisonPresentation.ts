// #region Imports

import type { IPullRequestComparison } from '@symphony/domain-delivery';
import type { IPullRequestComparisonPresentation } from './IPullRequestComparisonPresentation';
import { translateLabel } from '@symphony/frontend-intl/labels';

// #endregion

/**
 * Turns a branch comparison into the decision GitHub shows above the pull-request form: whether
 * the range can become a pull request at all, and what would enter the target branch.
 */
export function resolvePullRequestComparisonPresentation(
  comparison: IPullRequestComparison,
): IPullRequestComparisonPresentation {
  if (comparison.existingPullRequest) {
    const existingPullRequest = comparison.existingPullRequest;
    return {
      variant: 'warning',
      iconName: 'errorCircle',
      header: translateLabel('loc.symphony.labels.a.pull.request.already.exists.2919f2a'),
      get detail() {
        return translateLabel(
          'loc.symphony.labels.pull.request.already.merges.into.d514bfc',
          existingPullRequest.number,
          comparison.sourceBranch,
          comparison.targetBranch,
        );
      },
      comparable: false,
    };
  }
  if (comparison.aheadBy === 0) {
    return {
      variant: 'neutral',
      iconName: 'info',
      header: translateLabel('loc.symphony.labels.there.isn.t.anything.to.compare.146936b'),
      get detail() {
        return comparison.behindBy === 0
          ? translateLabel(
              'loc.symphony.labels.and.are.identical.1de7219',
              comparison.targetBranch,
              comparison.sourceBranch,
            )
          : translateLabel(
              'loc.symphony.labels.is.behind.and.carries.nothing.new.7478613',
              comparison.sourceBranch,
              countLabel(comparison.behindBy, 'commit'),
              comparison.targetBranch,
            );
      },
      comparable: false,
    };
  }
  const carried = translateLabel(
    'loc.symphony.labels.and.would.enter.8b3f031',
    countLabel(comparison.aheadBy, 'commit'),
    countLabel(comparison.changedFiles, 'changed file'),
    comparison.targetBranch,
  );
  if (comparison.status === 'diverged') {
    return {
      variant: 'warning',
      iconName: 'errorCircle',
      header: translateLabel('loc.symphony.labels.both.branches.moved.on.b7aadc9'),
      get detail() {
        return translateLabel(
          'loc.symphony.labels.is.ahead.as.well.so.github.decides.whether.the.merge.217d41e',
          carried,
          comparison.targetBranch,
          countLabel(comparison.behindBy, 'commit'),
        );
      },
      comparable: true,
    };
  }
  return {
    variant: 'success',
    iconName: 'checkmark',
    header: translateLabel('loc.symphony.labels.able.to.merge.b2b71dd'),
    detail: carried,
    comparable: true,
  };
}

function countLabel(count: number, singular: 'commit' | 'changed file'): string {
  if (singular === 'commit')
    return count === 1
      ? translateLabel('loc.symphony.labels.commit.1af6d49', count)
      : translateLabel('loc.symphony.labels.commits.a50fe77', count);
  return count === 1
    ? translateLabel('loc.symphony.labels.changed.file.fb5946f', count)
    : translateLabel('loc.symphony.labels.changed.files.dd8411f', count);
}
