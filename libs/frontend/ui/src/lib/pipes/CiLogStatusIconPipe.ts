// #region Imports

import { Pipe, type PipeTransform } from '@angular/core';
import type { CiRunLogState } from '@symphony/domain-ci';

// #endregion

@Pipe({ name: 'ciLogStatusIcon', standalone: true, pure: true })
export class CiLogStatusIconPipe implements PipeTransform {
  // #region Methods

  /**
   * Transforms the input value for display.
   *
   * @param status - Status.
   * @public
   */
  public transform(status: CiRunLogState): string {
    if (status === 'succeeded') return 'checkmark';
    if (status === 'failed') return 'errorCircle';
    if (status === 'cancelled' || status === 'skipped') return 'clear';
    return 'executionOutline';
  }

  // #endregion
}
