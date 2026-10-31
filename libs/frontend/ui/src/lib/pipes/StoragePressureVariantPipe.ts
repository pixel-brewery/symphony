// #region Imports

import { Pipe, type PipeTransform } from '@angular/core';
import type { StorageStatusDto } from '@symphony/ipc-contracts-platform';

// #endregion

type StoragePressure = StorageStatusDto['global']['pressure'] | undefined;

@Pipe({ name: 'storagePressureVariant', standalone: true, pure: true })
export class StoragePressureVariantPipe implements PipeTransform {
  // #region Methods

  /**
   * Transforms the input value for display.
   *
   * @param pressure - Pressure.
   * @public
   */
  public transform(pressure: StoragePressure): 'success' | 'warning' | 'danger' {
    if (pressure === 'healthy') return 'success';
    if (pressure === 'warning') return 'warning';
    return 'danger';
  }

  // #endregion
}
