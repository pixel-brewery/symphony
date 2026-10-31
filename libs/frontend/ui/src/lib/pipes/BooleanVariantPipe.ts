// #region Imports

import { Pipe, type PipeTransform } from '@angular/core';
import type { Variant } from '@pixel-brewery/mosaik-elements-foundation';

// #endregion

@Pipe({ name: 'booleanVariant', standalone: true, pure: true })
export class BooleanVariantPipe implements PipeTransform {
  // #region Methods

  /**
   * Transforms the input value for display.
   *
   * @param condition - Condition.
   * @param whenTrue - When true.
   * @param whenFalse - When false.
   * @public
   */
  public transform(condition: boolean, whenTrue: Variant, whenFalse: Variant): Variant {
    return condition ? whenTrue : whenFalse;
  }

  // #endregion
}
