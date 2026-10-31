// #region Imports

import { Pipe, type PipeTransform } from '@angular/core';
import type { CiRunLogState } from '@symphony/domain-ci';
import type { IRunStepPresentation } from './IRunStepPresentation';

// #endregion

/**
 * Maps a job or step state to its icon; a step in progress shows a progress ring instead.
 *
 * @public
 */
@Pipe({ name: 'runStepPresentation', standalone: true, pure: true })
export class RunStepPresentationPipe implements PipeTransform {
  // #region Methods

  /**
   * Resolves the icon.
   *
   * @param status - Job or step state.
   * @returns Icon and variant.
   * @public
   */
  public transform(status: CiRunLogState): IRunStepPresentation {
    switch (status) {
      case 'succeeded':
        return { icon: 'checkmarkCircle', variant: 'default' };
      case 'failed':
        return { icon: 'errorCircle', variant: 'danger' };
      case 'cancelled':
      case 'skipped':
        return { icon: 'clear', variant: 'default' };
      case 'queued':
      case 'in-progress':
        return { icon: 'executionOutline', variant: 'neutral' };
    }
  }

  // #endregion
}
