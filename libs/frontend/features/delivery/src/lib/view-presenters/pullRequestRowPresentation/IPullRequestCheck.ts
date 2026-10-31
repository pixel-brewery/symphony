// #region Imports

import type { ICiRun } from '@symphony/domain-ci';

// #endregion

/**
 * The newest result of one workflow on a pull request's branch, from GitHub or the local runner,
 * whichever ran it last.
 *
 * @public
 */
export interface IPullRequestCheck {
  /** Workflow run the check belongs to. */
  readonly run: ICiRun;
  /** Where the newest result comes from. */
  readonly source: 'cloud' | 'local';
  /** Newest state of the run. */
  readonly state: ICiRun['status'];
  /** When the newest result started, when known. */
  readonly startedAt?: string;
  /** When the newest result finished, when it has. */
  readonly finishedAt?: string;
}
