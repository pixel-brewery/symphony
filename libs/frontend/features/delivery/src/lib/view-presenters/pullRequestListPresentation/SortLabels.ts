// #region Imports

import type { PullRequestSort } from './PullRequestSort';

// #endregion

export const SORT_LABELS: Readonly<Record<PullRequestSort, string>> = {
  'updated-descending': 'Recently updated',
  'created-descending': 'Newest',
  'created-ascending': 'Oldest',
};
