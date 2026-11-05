// #region Imports

import { Pipe, type PipeTransform } from '@angular/core';
import type { ICiRun } from '@symphony/domain-ci';
import type { IActionRunBadge } from './IActionRunBadge';
import { translateLabel } from '@symphony/frontend-intl/labels';

// #endregion

/**
 * Maps a run state to its result badge in the run tables.
 *
 * @public
 */
@Pipe({ name: 'actionRunBadge', standalone: true, pure: false })
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
        return {
          get label() {
            return translateLabel('loc.symphony.labels.passed.436fe71');
          },
          variant: 'success',
          appearance: 'soft',
        };
      case 'failed':
        return {
          get label() {
            return translateLabel('loc.symphony.labels.failed.031a8f0');
          },
          variant: 'danger',
          appearance: 'soft',
        };
      case 'cancelled':
        return {
          get label() {
            return translateLabel('loc.symphony.labels.cancelled.d353a99');
          },
          variant: 'default',
          appearance: 'outline',
        };
      case 'queued':
        return {
          get label() {
            return translateLabel('loc.symphony.labels.queued.661ff40');
          },
          variant: 'info',
          appearance: 'soft',
        };
      case 'in-progress':
        return {
          get label() {
            return translateLabel('loc.symphony.labels.running.f4ccae2');
          },
          variant: 'primary',
          appearance: 'soft',
        };
    }
  }

  // #endregion
}
