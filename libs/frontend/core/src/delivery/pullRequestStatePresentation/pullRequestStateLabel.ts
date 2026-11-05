// #region Imports

import type { PullRequestState } from './PullRequestState';
import { translateLabel } from '@symphony/frontend-intl/labels';

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
      return translateLabel('loc.symphony.labels.open.ed077f3');
    case 'draft':
      return translateLabel('loc.symphony.labels.draft.ebf12ef');
    case 'merged':
      return translateLabel('loc.symphony.labels.merged.bd0a062');
    case 'closed':
      return translateLabel('loc.symphony.labels.closed.c21ead0');
  }
}
