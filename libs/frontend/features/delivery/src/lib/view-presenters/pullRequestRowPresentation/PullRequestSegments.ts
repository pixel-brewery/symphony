// #region Imports

import type { PullRequestSegment } from './PullRequestSegment';

// #endregion

/**
 * Every pull-request segment, in the order the segment control shows them.
 *
 * @public
 */
export const PULL_REQUEST_SEGMENTS: readonly PullRequestSegment[] = [
  'open',
  'needs-action',
  'drafts',
];
