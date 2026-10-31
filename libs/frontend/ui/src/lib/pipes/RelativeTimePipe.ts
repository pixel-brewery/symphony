// #region Imports

import { Pipe, type PipeTransform } from '@angular/core';
import { formatRelativeTime } from '@symphony/frontend-core';

// #endregion

/**
 * Formats a timestamp as a compact age (`12 min`, `3 h`, `Yesterday`) or, with `'ago'`, as a
 * sentence fragment (`2 min ago`). Pass `Clock.now()` so the label follows the shared clock.
 *
 * @public
 */
@Pipe({ name: 'relativeTime' })
export class RelativeTimePipe implements PipeTransform {
  // #region Methods

  /**
   * Formats the age of a timestamp.
   *
   * @param value - ISO timestamp or epoch milliseconds.
   * @param now - Reference time in epoch milliseconds.
   * @param style - `'compact'` (default) or `'ago'`.
   * @returns The formatted age.
   * @public
   */
  public transform(
    value: string | number | null | undefined,
    now: number,
    style: 'compact' | 'ago' = 'compact',
  ): string {
    return formatRelativeTime(value, now, style === 'ago');
  }

  // #endregion
}
