// #region Imports

import type { IActionRunRow } from './IActionRunRow';

// #endregion

/**
 * The moment a run is ordered by: when it started, or when it finished if no start is known.
 *
 * @param row - Run row.
 * @returns ISO timestamp, or an empty string.
 * @public
 */
export function runTimestamp(row: Pick<IActionRunRow, 'startedAt' | 'finishedAt'>): string {
  return row.startedAt ?? row.finishedAt ?? '';
}
