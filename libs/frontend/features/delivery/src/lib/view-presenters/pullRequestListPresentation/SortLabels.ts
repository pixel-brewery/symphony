// #region Imports

import type { PullRequestSort } from './PullRequestSort';
import { translateLabel } from '@symphony/frontend-intl/labels';

// #endregion

export const SORT_LABELS: Readonly<Record<PullRequestSort, string>> = {
  get 'updated-descending'() {
    return translateLabel('loc.symphony.labels.recently.updated.474b2a8');
  },
  get 'created-descending'() {
    return translateLabel('loc.symphony.labels.newest.d15efa1');
  },
  get 'created-ascending'() {
    return translateLabel('loc.symphony.labels.oldest.505dc45');
  },
};
