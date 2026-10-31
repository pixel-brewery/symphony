// #region Imports

import { Pipe, type PipeTransform } from '@angular/core';
import type { StorageStatusDto } from '@symphony/ipc-contracts-platform';

// #endregion

type StoragePressure = StorageStatusDto['global']['pressure'] | undefined;

@Pipe({ name: 'storagePressureLabel', standalone: true, pure: true })
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
        return 'Within limit';
      case 'warning':
        return 'Approaching limit';
      case 'danger':
        return 'High usage';
      case 'critical':
        return 'Writes blocked';
      default:
        return 'Measuring…';
    }
  }

  // #endregion
}
