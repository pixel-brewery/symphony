// #region Imports

import { Pipe, type PipeTransform } from '@angular/core';
import type { GoalState } from '@symphony/domain-execution';
import { translateLabel } from '@symphony/frontend-intl/labels';

// #endregion

@Pipe({ name: 'goalStateLabel', standalone: true, pure: false })
export class GoalStateLabelPipe implements PipeTransform {
  // #region Methods

  /**
   * Transforms the input value for display.
   *
   * @param state - State.
   * @public
   */
  public transform(state: GoalState | undefined): string {
    switch (state) {
      case 'planning':
        return translateLabel('loc.symphony.labels.understanding.the.assignment.cb52d29');
      case 'ready':
        return translateLabel('loc.symphony.labels.ready.to.implement.fe6d625');
      case 'implementing':
        return translateLabel('loc.symphony.labels.implementing.the.changes.a9d2766');
      case 'verifying':
        return translateLabel('loc.symphony.labels.checking.the.result.60745a8');
      case 'reviewing':
        return translateLabel('loc.symphony.labels.ready.for.your.review.cfe3b83');
      case 'revision-required':
        return translateLabel('loc.symphony.labels.changes.requested.10a92a8');
      case 'achieved':
        return translateLabel('loc.symphony.labels.completed.22a970d');
      case 'blocked':
        return translateLabel('loc.symphony.labels.needs.your.attention.11de928');
      case undefined:
        return translateLabel('loc.symphony.labels.not.assigned.13075c2');
    }
  }

  // #endregion
}
