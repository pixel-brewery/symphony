// #region Imports

import type { ICiRun } from '@symphony/domain-ci';

// #endregion

/**
 * The narrowing applied to every run list of the Actions screen.
 *
 * @public
 */
export interface IActionRunFilter {
  /** Only runs in this state. @public @readonly */
  readonly status?: ICiRun['status'];
  /** Only runs started by this actor. @public @readonly */
  readonly actor?: string;
  /** Normalized contextual search text; empty matches every run. @public @readonly */
  readonly query: string;
}
