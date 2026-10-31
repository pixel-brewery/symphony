// #region Imports

import type { IActionRunRow } from './IActionRunRow';

// #endregion

/**
 * What `All runs` shows: the runs in progress across every workflow and the finished history.
 *
 * @public
 */
export interface IActionsOverview {
  /** Every running and queued run, running first. @public @readonly */
  readonly running: readonly IActionRunRow[];
  /** The visible page of finished runs in the chosen order. @public @readonly */
  readonly history: readonly IActionRunRow[];
  /** Whether more finished runs exist beyond the visible page. @public @readonly */
  readonly hasOlderRuns: boolean;
}
