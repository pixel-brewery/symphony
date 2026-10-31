// #region Imports

import { Pipe, type PipeTransform } from '@angular/core';
import type { CiRunLogState } from '@symphony/domain-ci';

// #endregion

type LogVariant = 'danger' | 'success' | 'warning' | 'info' | 'neutral' | 'primary';

@Pipe({ name: 'ciLogStatusVariant', standalone: true, pure: true })
export class CiLogStatusVariantPipe implements PipeTransform {
  // #region Methods

  /**
   * Transforms the input value for display.
   *
   * @param status - Status.
   * @public
   */
  public transform(status: CiRunLogState): LogVariant {
    if (status === 'succeeded') return 'success';
    if (status === 'failed') return 'danger';
    if (status === 'cancelled' || status === 'skipped') return 'warning';
    if (status === 'in-progress') return 'info';
    if (status === 'queued') return 'neutral';
    return 'primary';
  }

  // #endregion
}
