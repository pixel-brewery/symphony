// #region Imports

import { Pipe, type PipeTransform } from '@angular/core';

// #endregion

/**
 * Colours a change badge: success for an improvement, danger for a decline, neutral where the
 * figure did not move or where more is neither better nor worse.
 *
 * @public
 */
@Pipe({ name: 'changeVariant' })
export class ChangeVariantPipe implements PipeTransform {
  // #region Methods

  /**
   * Maps a change to its badge variant.
   *
   * @param change - Current minus previous value.
   * @param better - Which direction is an improvement, or `'none'` for a neutral figure.
   * @returns The badge variant.
   * @public
   */
  public transform(
    change: number,
    better: 'higher' | 'lower' | 'none',
  ): 'success' | 'danger' | 'neutral' {
    if (change === 0 || better === 'none') return 'neutral';
    return change > 0 === (better === 'higher') ? 'success' : 'danger';
  }

  // #endregion
}
