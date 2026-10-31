// #region Imports

import { Pipe, type PipeTransform } from '@angular/core';
import type { ICiRun } from '@symphony/domain-ci';
import {
  resolveActionStatusVariant,
  type ActionStatusVariant,
} from '@symphony/frontend-core/delivery';

// #endregion

@Pipe({ name: 'ciRunStatusVariant', standalone: true, pure: true })
export class CiRunStatusVariantPipe implements PipeTransform {
  // #region Methods

  /**
   * Transforms the input value for display.
   *
   * @param status - Status.
   * @public
   */
  public transform(status: ICiRun['status'] | string): ActionStatusVariant {
    return resolveActionStatusVariant(status as ICiRun['status']);
  }

  // #endregion
}
