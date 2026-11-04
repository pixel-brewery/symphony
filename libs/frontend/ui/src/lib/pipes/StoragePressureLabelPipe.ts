// #region Imports

import { Pipe, type PipeTransform } from '@angular/core';
import type { StorageStatusDto } from '@symphony/ipc-contracts-platform';
import { translateLabel } from '@symphony/frontend-intl/labels';

// #endregion

type StoragePressure = StorageStatusDto['global']['pressure'] | undefined;

@Pipe({ name: 'storagePressureLabel', standalone: true, pure: false })
export class StoragePressureLabelPipe implements PipeTransform {
  // #region Methods

  /**
   * Transforms the input value for display.
   *
   * @param pressure - Pressure.
   * @public
   */
  public transform(pressure: StoragePressure): string {
    switch (pressure) {
      case 'healthy':
        return translateLabel('loc.symphony.labels.within.limit.ffd32e2');
      case 'warning':
        return translateLabel('loc.symphony.labels.approaching.limit.9f01b44');
      case 'danger':
        return translateLabel('loc.symphony.labels.high.usage.e447515');
      case 'critical':
        return translateLabel('loc.symphony.labels.writes.blocked.a989033');
      default:
        return translateLabel('loc.symphony.labels.measuring.a1f421d');
    }
  }

  // #endregion
}
