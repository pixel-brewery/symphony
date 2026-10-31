// #region Imports

import { Pipe, type PipeTransform } from '@angular/core';
import type { ICiRun } from '@symphony/domain-ci';

// #endregion

/**
 * Maps the state of one check to its status icon. A running check shows a progress ring instead,
 * so it has no icon here.
 *
 * @public
 */
@Pipe({ name: 'pullRequestCheckIcon', standalone: true, pure: true })
export class PullRequestCheckIconPipe implements PipeTransform {
  // #region Methods

  /**
   * Transforms the input value for display.
   *
   * @param state - Check state.
   * @returns The registered icon name.
   * @public
   */
  public transform(state: ICiRun['status']): string {
    switch (state) {
      case 'failed':
        return 'errorCircle';
      case 'succeeded':
        return 'checkmarkCircle';
      case 'cancelled':
        return 'dismiss-circle';
      case 'queued':
        return 'clock';
      case 'in-progress':
        return 'sync';
    }
  }

  // #endregion
}
