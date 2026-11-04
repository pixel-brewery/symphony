// #region Imports

import { Pipe, type PipeTransform } from '@angular/core';
import type { ICiRun } from '@symphony/domain-ci';
import { translateLabel } from '@symphony/frontend-intl/labels';

// #endregion

/**
 * Names the result of one check the way the work-item screen's checks table shows it.
 *
 * @public
 */
@Pipe({ name: 'workItemCheckStatusLabel', standalone: true, pure: false })
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
        return translateLabel('loc.symphony.labels.passed.436fe71');
      case 'in-progress':
        return translateLabel('loc.symphony.labels.running.f4ccae2');
      case 'failed':
        return translateLabel('loc.symphony.labels.failed.031a8f0');
      case 'queued':
        return translateLabel('loc.symphony.labels.queued.661ff40');
      case 'cancelled':
        return translateLabel('loc.symphony.labels.cancelled.d353a99');
    }
  }

  // #endregion
}
