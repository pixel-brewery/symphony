// #region Imports

import { Pipe, type PipeTransform } from '@angular/core';
import type { GoalState } from '@symphony/domain-execution';

// #endregion

@Pipe({ name: 'goalStateLabel', standalone: true, pure: true })
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
        return 'Understanding the assignment';
      case 'ready':
        return 'Ready to implement';
      case 'implementing':
        return 'Implementing the changes';
      case 'verifying':
        return 'Checking the result';
      case 'reviewing':
        return 'Ready for your review';
      case 'revision-required':
        return 'Changes requested';
      case 'achieved':
        return 'Completed';
      case 'blocked':
        return 'Needs your attention';
      case undefined:
        return 'Not assigned';
    }
  }

  // #endregion
}
