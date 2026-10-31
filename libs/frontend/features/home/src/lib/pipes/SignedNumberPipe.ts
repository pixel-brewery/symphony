// #region Imports

import { Pipe, type PipeTransform } from '@angular/core';

// #endregion

/**
 * Formats a change with its sign — `+3`, `−0.8`, `0` — using the typographic minus.
 *
 * @public
 */
@Pipe({ name: 'signedNumber' })
export class SignedNumberPipe implements PipeTransform {
  // #region Methods

  /**
   * Formats a signed number.
   *
   * @param value - The change.
   * @param fractionDigits - Decimal places to keep (default none).
   * @returns The signed label.
   * @public
   */
  public transform(value: number, fractionDigits = 0): string {
    const factor = 10 ** fractionDigits;
    const rounded = Math.round(Math.abs(value) * factor) / factor;
    if (rounded === 0) return '0';
    return `${value > 0 ? '+' : '−'}${rounded.toFixed(fractionDigits)}`;
  }

  // #endregion
}
