// #region Imports

import { Pipe, type PipeTransform } from '@angular/core';
import type { ICiRun } from '@symphony/domain-ci';
import type { IActionRunBadge } from './IActionRunBadge';

// #endregion

/**
 * Maps a run state to its result badge in the run tables.
 *
 * @public
 */
@Pipe({ name: 'actionRunBadge', standalone: true, pure: true })
export class ActionRunBadgePipe implements PipeTransform {
  // #region Methods

  /**
   * Resolves the badge.
   *
   * @param status - Run state.
   * @returns Label, variant and appearance.
   * @public
   */
  public transform(status: ICiRun['status']): IActionRunBadge {
    switch (status) {
      case 'succeeded':
        return { label: 'Passed', variant: 'success', appearance: 'soft' };
      case 'failed':
        return { label: 'Failed', variant: 'danger', appearance: 'soft' };
      case 'cancelled':
        return { label: 'Cancelled', variant: 'default', appearance: 'outline' };
      case 'queued':
        return { label: 'Queued', variant: 'info', appearance: 'soft' };
      case 'in-progress':
        return { label: 'Running', variant: 'primary', appearance: 'soft' };
    }
  }

  // #endregion
}
