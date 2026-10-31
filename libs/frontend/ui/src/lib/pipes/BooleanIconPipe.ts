// #region Imports

import { Pipe, type PipeTransform } from '@angular/core';

// #endregion

@Pipe({ name: 'booleanIcon', standalone: true, pure: true })
export class BooleanIconPipe implements PipeTransform {
  // #region Methods

  /**
   * Transforms the input value for display.
   *
   * @param condition - Condition.
   * @param whenTrue - When true.
   * @param whenFalse - When false.
   * @public
   */
  public transform(condition: boolean, whenTrue: string, whenFalse: string): string {
    return condition ? whenTrue : whenFalse;
  }

  // #endregion
}
