// #region Imports

import { Pipe, type PipeTransform } from '@angular/core';
import type { PullRequestMergeState } from '../view-presenters/pullRequestRowPresentation';

// #endregion

/**
 * Names a pull request's merge state; `—` when GitHub has not qualified it.
 *
 * @public
 */
@Pipe({ name: 'pullRequestMergeStateLabel', standalone: true, pure: true })
export class PullRequestMergeStateLabelPipe implements PipeTransform {
  // #region Methods

  /**
   * Transforms the input value for display.
   *
   * @param state - Merge state.
   * @returns The label.
   * @public
   */
  public transform(state: PullRequestMergeState): string {
    switch (state) {
      case 'draft':
        return 'Draft';
      case 'conflict':
        return 'Conflict';
      case 'behind':
        return 'Behind base';
      case 'ready':
        return 'Ready';
      case 'mergeable':
        return 'Mergeable';
      case 'merged':
        return 'Merged';
      case 'closed':
        return 'Closed';
      case 'unknown':
        return '—';
    }
  }

  // #endregion
}
