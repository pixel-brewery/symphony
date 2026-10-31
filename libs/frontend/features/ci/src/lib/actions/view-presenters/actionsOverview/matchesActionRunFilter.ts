// #region Imports

import type { IActionRunFilter } from './IActionRunFilter';
import type { IActionRunRow } from './IActionRunRow';

// #endregion

/**
 * Whether a run passes the status, author and contextual-search narrowing.
 *
 * @param row - Run row.
 * @param filter - Active narrowing.
 * @returns `true` when the run stays visible.
 * @public
 */
export function matchesActionRunFilter(row: IActionRunRow, filter: IActionRunFilter): boolean {
  if (filter.status && row.status !== filter.status) return false;
  if (filter.actor && row.actor !== filter.actor) return false;
  if (!filter.query) return true;
  return [
    row.workflowName,
    row.run?.title,
    row.actor,
    row.event,
    row.branch,
    row.revision,
    row.status,
    row.run?.runNumber,
  ]
    .join(' ')
    .toLocaleLowerCase()
    .includes(filter.query);
}
