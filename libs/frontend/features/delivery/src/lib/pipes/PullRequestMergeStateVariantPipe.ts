// #region Imports

import { Pipe, type PipeTransform } from '@angular/core';
import type { Variant } from '@pixel-brewery/mosaik-elements-foundation';
import type { PullRequestMergeState } from '../view-presenters/pullRequestRowPresentation';

// #endregion

/**
 * Maps a pull request's merge state to the badge variant.
 *
 * @public
 */
@Pipe({ name: 'pullRequestMergeStateVariant', standalone: true, pure: true })
export class PullRequestMergeStateVariantPipe implements PipeTransform {
  // #region Methods

  /**
   * Transforms the input value for display.
   *
   * @param state - Merge state.
   * @returns The variant.
   * @public
   */
  public transform(state: PullRequestMergeState): Variant {
    switch (state) {
      case 'conflict':
        return 'danger';
      case 'behind':
        return 'warning';
      case 'ready':
        return 'success';
      case 'merged':
        return 'primary';
      case 'draft':
      case 'mergeable':
      case 'closed':
      case 'unknown':
        return 'neutral';
    }
  }

  // #endregion
}
