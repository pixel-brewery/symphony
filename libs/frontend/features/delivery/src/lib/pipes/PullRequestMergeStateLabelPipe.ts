// #region Imports

import { Pipe, type PipeTransform } from '@angular/core';
import type { PullRequestMergeState } from '../view-presenters/pullRequestRowPresentation';
import { translateLabel } from '@symphony/frontend-intl/labels';

// #endregion

/**
 * Names a pull request's merge state; `—` when GitHub has not qualified it.
 *
 * @public
 */
@Pipe({ name: 'pullRequestMergeStateLabel', standalone: true, pure: false })
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
        return translateLabel('loc.symphony.labels.draft.ebf12ef');
      case 'conflict':
        return translateLabel('loc.symphony.labels.conflict.014659a');
      case 'behind':
        return translateLabel('loc.symphony.labels.behind.base.4491815');
      case 'ready':
        return translateLabel('loc.symphony.labels.ready.5fa7aac');
      case 'mergeable':
        return translateLabel('loc.symphony.labels.mergeable.e8007ab');
      case 'merged':
        return translateLabel('loc.symphony.labels.merged.bd0a062');
      case 'closed':
        return translateLabel('loc.symphony.labels.closed.c21ead0');
      case 'unknown':
        return '—';
    }
  }

  // #endregion
}
