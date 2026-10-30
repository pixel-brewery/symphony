// #region Imports

import { Pipe, type PipeTransform } from '@angular/core';
import { storageSize } from './storageSize';

// #endregion

@Pipe({ name: 'storageSize', standalone: true, pure: true })
export class StorageSizePipe implements PipeTransform {
  // #region Methods

  /**
   * Transforms the input value for display.
   *
   * @param bytes - Bytes.
   * @public
   */
  public transform(bytes: number | undefined): string {
    return storageSize(bytes);
  }

  // #endregion
}
