// #region Imports

import type { PullRequestState } from './PullRequestState';

// #endregion

/** Every listable pull-request state, in the order a reviewer works through them. */
export const PULL_REQUEST_STATES: readonly PullRequestState[] = [
  'open',
  'draft',
  'merged',
  'closed',
];
