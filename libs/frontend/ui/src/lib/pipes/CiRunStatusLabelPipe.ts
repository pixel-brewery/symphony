// #region Imports

import { Pipe, type PipeTransform } from '@angular/core';
import type { ICiRun } from '@symphony/domain-ci';
import { actionStatusLabel } from '@symphony/frontend-core/delivery';

// #endregion

@Pipe({ name: 'ciRunStatusLabel', standalone: true, pure: true })
export class CiRunStatusLabelPipe implements PipeTransform {
  // #region Methods

  /**
   * Transforms the input value for display.
   *
   * @param status - Status.
   * @public
   */
  public transform(status: ICiRun['status'] | string): string {
    return actionStatusLabel(status as ICiRun['status']);
  }

  // #endregion
}
