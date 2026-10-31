// #region Imports

import { Pipe, type PipeTransform } from '@angular/core';

// #endregion

/**
 * Greets by the time of day: `Good morning`, `Good afternoon` or `Good evening`.
 *
 * @public
 */
@Pipe({ name: 'greeting', standalone: true, pure: true })
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
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  }

  // #endregion
}
