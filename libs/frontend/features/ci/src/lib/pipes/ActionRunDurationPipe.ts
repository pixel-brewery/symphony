// #region Imports

import { Pipe, type PipeTransform } from '@angular/core';

// #endregion

/**
 * Formats how long a run or step took: `42s`, `4m 12s`, `1h 05m`. An unfinished or unknown span
 * yields an empty string, which the table shows as `—`.
 *
 * @public
 */
@Pipe({ name: 'actionRunDuration', standalone: true, pure: true })
export class ActionRunDurationPipe implements PipeTransform {
  // #region Methods

  /**
   * Formats the span between two timestamps.
   *
   * @param startedAt - Start.
   * @param finishedAt - End.
   * @returns The duration, or an empty string.
   * @public
   */
  public transform(startedAt: string | undefined, finishedAt: string | undefined): string {
    if (!startedAt || !finishedAt) return '';
    const start = Date.parse(startedAt);
    const end = Date.parse(finishedAt);
    if (!Number.isFinite(start) || !Number.isFinite(end)) return '';
    const seconds = Math.max(0, Math.round((end - start) / 1_000));
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ${String(seconds % 60).padStart(2, '0')}s`;
    return `${Math.floor(minutes / 60)}h ${String(minutes % 60).padStart(2, '0')}m`;
  }

  // #endregion
}
