// #region Imports

import type { ICiRun } from '@symphony/domain-ci';

// #endregion

/**
 * Whether a run is still waiting or executing.
 *
 * @param status - Run state.
 * @returns `true` for `queued` and `in-progress`.
 * @public
 */
export function isActiveRunStatus(status: ICiRun['status']): boolean {
  return status === 'queued' || status === 'in-progress';
}
