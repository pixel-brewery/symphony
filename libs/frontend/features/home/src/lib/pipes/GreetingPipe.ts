// #region Imports

import { Pipe, type PipeTransform } from '@angular/core';
import { translateLabel } from '@symphony/frontend-intl/labels';

// #endregion

/**
 * Greets by the time of day: `Good morning`, `Good afternoon` or `Good evening`.
 *
 * @public
 */
@Pipe({ name: 'greeting', standalone: true, pure: false })
export class GreetingPipe implements PipeTransform {
  // #region Methods

  /**
   * Transforms the input value for display.
   *
   * @param value - The current time, as a date or epoch milliseconds.
   * @returns The greeting.
   * @public
   */
  public transform(value: Date | number): string {
    const hour = new Date(value).getHours();
    if (hour < 12) return translateLabel('loc.symphony.labels.good.morning.90a90a4');
    if (hour < 18) return translateLabel('loc.symphony.labels.good.afternoon.d325e1b');
    return translateLabel('loc.symphony.labels.good.evening.15a421e');
  }

  // #endregion
}
