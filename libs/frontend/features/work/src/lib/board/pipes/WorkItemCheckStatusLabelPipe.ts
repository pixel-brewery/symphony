// #region Imports

import { Pipe, type PipeTransform } from '@angular/core';
import type { ICiRun } from '@symphony/domain-ci';

// #endregion

/**
 * Names the result of one check the way the work-item screen's checks table shows it.
 *
 * @public
 */
@Pipe({ name: 'workItemCheckStatusLabel', standalone: true, pure: true })
export class WorkItemCheckStatusLabelPipe implements PipeTransform {
  // #region Methods

  /**
   * Returns the label.
   *
   * @param status - Status of the check's run.
   * @returns `Passed`, `Running`, `Failed`, `Queued` or `Cancelled`.
   * @public
   */
  public transform(status: ICiRun['status']): string {
    switch (status) {
      case 'succeeded':
        return 'Passed';
      case 'in-progress':
        return 'Running';
      case 'failed':
        return 'Failed';
      case 'queued':
        return 'Queued';
      case 'cancelled':
        return 'Cancelled';
    }
  }

  // #endregion
}
