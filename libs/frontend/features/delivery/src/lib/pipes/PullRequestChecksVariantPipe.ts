// #region Imports

import { Pipe, type PipeTransform } from '@angular/core';
import type { Variant } from '@pixel-brewery/mosaik-elements-foundation';
import type { PullRequestChecksState } from '../view-presenters/pullRequestRowPresentation';

// #endregion

/**
 * Maps the combined state of a pull request's checks to the badge variant.
 *
 * @public
 */
@Pipe({ name: 'pullRequestChecksVariant', standalone: true, pure: true })
export class PullRequestChecksVariantPipe implements PipeTransform {
  // #region Methods

  /**
   * Transforms the input value for display.
   *
   * @param state - Combined checks state.
   * @returns The variant.
   * @public
   */
  public transform(state: PullRequestChecksState): Variant {
    switch (state) {
      case 'failing':
        return 'danger';
      case 'running':
        return 'info';
      case 'passed':
        return 'success';
      case 'cancelled':
      case 'none':
        return 'neutral';
    }
  }

  // #endregion
}
