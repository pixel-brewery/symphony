// #region Imports

import { Pipe, type PipeTransform } from '@angular/core';
import type { IPullRequestComparison } from '@symphony/domain-delivery';
import {
  resolvePullRequestComparisonPresentation,
  type IPullRequestComparisonPresentation,
} from '../view-presenters/pullRequestComparisonPresentation';

// #endregion

@Pipe({ name: 'pullRequestComparisonPresentation', standalone: true, pure: true })
export class PullRequestComparisonPresentationPipe implements PipeTransform {
  // #region Methods

  /**
   * Transforms the input value for display.
   *
   * @param comparison - Comparison.
   * @public
   */
  public transform(comparison: IPullRequestComparison): IPullRequestComparisonPresentation {
    return resolvePullRequestComparisonPresentation(comparison);
  }

  // #endregion
}
