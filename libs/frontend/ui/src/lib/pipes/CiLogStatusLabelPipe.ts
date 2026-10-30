// #region Imports

import { Pipe, type PipeTransform } from '@angular/core';
import type { CiRunLogState } from '@symphony/domain-ci';

// #endregion

@Pipe({ name: 'ciLogStatusLabel', standalone: true, pure: true })
export class CiLogStatusLabelPipe implements PipeTransform {
  // #region Methods

  /**
   * Transforms the input value for display.
   *
   * @param status - Status.
   * @public
   */
  public transform(status: CiRunLogState): string {
    return status === 'in-progress'
      ? 'In progress'
      : `${status[0]?.toUpperCase()}${status.slice(1)}`;
  }

  // #endregion
}
