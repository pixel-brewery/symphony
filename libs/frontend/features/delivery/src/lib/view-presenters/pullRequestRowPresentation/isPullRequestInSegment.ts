// #region Imports

import type { IPullRequestRow } from './IPullRequestRow';
import type { PullRequestSegment } from './PullRequestSegment';

// #endregion

/**
 * Whether a row belongs to a segment. `Open` holds every open pull request including drafts, the
 * way GitHub counts them; `Needs action` the open ones someone has to act on; `Drafts` the drafts.
 *
 * @param row - Row.
 * @param segment - Segment.
 * @returns Whether the row is listed under the segment.
 * @public
 */
export function isPullRequestInSegment(
  row: Pick<IPullRequestRow, 'pullRequest' | 'needsAction'>,
  segment: PullRequestSegment,
): boolean {
  if (row.pullRequest.state !== 'open') return false;
  switch (segment) {
    case 'open':
      return true;
    case 'needs-action':
      return row.needsAction;
    case 'drafts':
      return row.pullRequest.draft;
  }
}
