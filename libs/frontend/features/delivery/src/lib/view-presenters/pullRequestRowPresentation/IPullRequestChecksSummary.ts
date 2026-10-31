// #region Imports

import type { PullRequestChecksState } from './PullRequestChecksState';

// #endregion

/**
 * The combined state of a pull request's checks with the counts it is derived from.
 *
 * @public
 */
export interface IPullRequestChecksSummary {
  /** Combined state. */
  readonly state: PullRequestChecksState;
  /** Number of failed checks. */
  readonly failing: number;
  /** Workflow names of the failed checks, in list order. */
  readonly failingNames: readonly string[];
  /** Number of checks. */
  readonly total: number;
}
