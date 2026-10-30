// #region Imports

import type { PullRequestBaseFilter } from './PullRequestBaseFilter';

// #endregion

export const BASE_FILTER_LABELS: Readonly<Record<PullRequestBaseFilter, string>> = {
  behind: 'Behind',
  conflicting: 'Conflicting',
};
