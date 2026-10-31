// #region Imports

import { Pipe, type PipeTransform } from '@angular/core';

// #endregion

const MINUTE = 60;
const HOUR = 60 * MINUTE;

/**
 * Formats how long a check ran as `42 s`, `3 min` or `1 h 5 min`; empty while it has not finished.
 *
 * @public
 */
@Pipe({ name: 'checkDuration', standalone: true, pure: true })
export class CheckDurationPipe implements PipeTransform {
  // #region Methods

  /**
   * Transforms the input value for display.
   *
   * @param startedAt - When the check started.
   * @param finishedAt - When it finished.
   * @returns The duration.
   * @public
   */
  public transform(startedAt: string | undefined, finishedAt: string | undefined): string {
    if (!startedAt || !finishedAt) return '';
    const elapsed = Date.parse(finishedAt) - Date.parse(startedAt);
    if (!Number.isFinite(elapsed)) return '';
    const seconds = Math.max(0, Math.round(elapsed / 1_000));
    if (seconds < MINUTE) return `${seconds} s`;
    if (seconds < HOUR) return `${Math.round(seconds / MINUTE)} min`;
    const minutes = Math.round((seconds % HOUR) / MINUTE);
    return minutes
      ? `${Math.floor(seconds / HOUR)} h ${minutes} min`
      : `${Math.floor(seconds / HOUR)} h`;
  }

  // #endregion
}
