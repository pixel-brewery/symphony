// #region Imports

import { Pipe, type PipeTransform } from '@angular/core';
import { storageSize } from '@symphony/frontend-ui';
import type { IStorageShare } from '../settings/IStorageShare';

// #endregion

/**
 * Joins storage shares into one line: `FLAMOX365 3.4 GB of 20 GB · Personal 0.6 GB of 20 GB` or
 * `base image 2.8 GB · actions/cache entries 1.6 GB`. A share without a measurement shows `—`.
 *
 * @public
 */
@Pipe({ name: 'storageShareSummary' })
export class StorageShareSummaryPipe implements PipeTransform {
  // #region Methods

  /**
   * Formats the shares.
   *
   * @param shares - Shares in display order.
   * @returns The joined line; empty without shares.
   * @public
   */
  public transform(shares: readonly IStorageShare[] | undefined): string {
    return (shares ?? [])
      .map((share) => {
        const size = share.allocatedBytes === undefined ? '—' : storageSize(share.allocatedBytes);
        const limit = share.limitGiB === undefined ? '' : ` of ${share.limitGiB} GB`;
        return `${share.label} ${size}${limit}`;
      })
      .join(' · ');
  }

  // #endregion
}
