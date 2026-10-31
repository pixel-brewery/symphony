// #region Imports

import { Pipe, type PipeTransform } from '@angular/core';

// #endregion

const defaultMaximumLength = 50;
const ellipsis = '...';

@Pipe({ name: 'truncateStart', standalone: true })
export class TruncateStartPipe implements PipeTransform {
  // #region Methods

  /**
   * Transforms the input value for display.
   *
   * @param value - Value.
   * @param maximumLength - Maximum length.
   * @public
   */
  public transform(value: string | null | undefined, maximumLength = defaultMaximumLength): string {
    if (!value) return '';

    const normalizedMaximumLength = Number.isFinite(maximumLength)
      ? Math.max(0, Math.trunc(maximumLength))
      : defaultMaximumLength;
    if (value.length <= normalizedMaximumLength) return value;
    if (normalizedMaximumLength <= ellipsis.length) {
      return ellipsis.slice(0, normalizedMaximumLength);
    }

    return `${ellipsis}${value.slice(-(normalizedMaximumLength - ellipsis.length))}`;
  }

  // #endregion
}
