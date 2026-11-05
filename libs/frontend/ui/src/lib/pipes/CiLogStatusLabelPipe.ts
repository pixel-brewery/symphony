// #region Imports

import { Pipe, type PipeTransform } from '@angular/core';
import type { CiRunLogState } from '@symphony/domain-ci';
import { translateLabel } from '@symphony/frontend-intl/labels';

// #endregion

@Pipe({ name: 'ciLogStatusLabel', standalone: true, pure: false })
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
      ? translateLabel('loc.symphony.labels.in.progress.c1f88e9')
      : `${status[0]?.toUpperCase()}${status.slice(1)}`;
  }

  // #endregion
}
