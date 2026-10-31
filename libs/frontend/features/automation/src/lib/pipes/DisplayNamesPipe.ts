// #region Imports

import { Pipe, type PipeTransform } from '@angular/core';

// #endregion

@Pipe({ name: 'displayNames', standalone: true, pure: true })
export class DisplayNamesPipe implements PipeTransform {
  // #region Methods

  /**
   * Transforms the input value for display.
   *
   * @param items - Items.
   * @public
   */
  public transform(items: readonly { readonly displayName: string }[]): string {
    return items.map((item) => item.displayName).join(', ');
  }

  // #endregion
}
