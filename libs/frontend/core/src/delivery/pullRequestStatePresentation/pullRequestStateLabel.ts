// #region Imports

import type { PullRequestState } from './PullRequestState';

// #endregion

/**
 * The label every surface uses for a pull-request state, so the home tile, the list filter and
 * the row badge can never disagree about what "open" is called.
 *
 * @param state - State.
 * @public
 */
export function pullRequestStateLabel(state: PullRequestState): string {
  switch (state) {
    case 'open':
      return 'Open';
    case 'draft':
      return 'Draft';
    case 'merged':
      return 'Merged';
    case 'closed':
      return 'Closed';
  }
}
