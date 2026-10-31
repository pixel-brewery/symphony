// #region Imports

import type { ICiRun, ICiRunHistory } from '@symphony/domain-ci';
import type { ICiRunHistoryQuery } from '../history/ICiRunHistoryQuery';

// #endregion

/**
 * Durable record of finished workflow runs, kept beyond the provider's newest-runs window.
 *
 * @public
 */
export interface ICiRunHistoryRepository {
  /**
   * Inserts or replaces finished runs by run id and attempt, then removes runs that started
   * before the retention bound.
   *
   * @param runs - Finished runs with a start instant.
   * @param retainSince - Runs that started earlier are removed (ISO).
   * @public
   */
  recordRuns(runs: readonly ICiRun[], retainSince: string): void;
  /**
   * Lists the recorded runs of the scope that started at or after `since`, newest first and at
   * most `limit` of them.
   *
   * @param query - Scope, lower bound and maximum.
   * @returns The runs and the instant from which they are complete.
   * @public
   */
  listRunHistory(query: ICiRunHistoryQuery): ICiRunHistory;
}
