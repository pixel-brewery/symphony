// #region Imports

import type { ActionsRunSort } from '../actionsListPresentation/ActionsRunSort';
import type { IActionRunFilter } from './IActionRunFilter';
import type { IActionRunRow } from './IActionRunRow';
import type { IActionsOverview } from './IActionsOverview';
import { isActiveRunStatus } from './isActiveRunStatus';
import { matchesActionRunFilter } from './matchesActionRunFilter';
import { runTimestamp } from './runTimestamp';

// #endregion

/**
 * Splits the run rows into `Running now` and the `History` page of `All runs`.
 *
 * @param rows - Run rows of every workflow.
 * @param filter - Active narrowing.
 * @param sort - History order.
 * @param historyLimit - Number of finished runs to show.
 * @returns The overview projection.
 * @public
 */
export function projectActionsOverview(
  rows: readonly IActionRunRow[],
  filter: IActionRunFilter,
  sort: ActionsRunSort,
  historyLimit: number,
): IActionsOverview {
  const visible = rows.filter((row) => matchesActionRunFilter(row, filter));
  const running = visible
    .filter((row) => isActiveRunStatus(row.status))
    .toSorted(
      (left, right) =>
        Number(right.status === 'in-progress') - Number(left.status === 'in-progress') ||
        runTimestamp(right).localeCompare(runTimestamp(left)),
    );
  const direction = sort === 'started-ascending' ? 1 : -1;
  const finished = visible
    .filter((row) => !isActiveRunStatus(row.status))
    .toSorted((left, right) => direction * runTimestamp(left).localeCompare(runTimestamp(right)));
  return {
    running,
    history: finished.slice(0, historyLimit),
    hasOlderRuns: finished.length > historyLimit,
  };
}
