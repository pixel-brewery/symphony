// #region Imports

import { Pipe, type PipeTransform } from '@angular/core';

// #endregion

@Pipe({ name: 'selectionAppearance', standalone: true, pure: true })
export class SelectionAppearancePipe implements PipeTransform {
  // #region Methods

  /**
   * Transforms the input value for display.
   *
   * @param selected - Selected.
   * @public
   */
  public transform(selected: boolean): 'solid' | 'outline' {
    return selected ? 'solid' : 'outline';
  }

  // #endregion
}
