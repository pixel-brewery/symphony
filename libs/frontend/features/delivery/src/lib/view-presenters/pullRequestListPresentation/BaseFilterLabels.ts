// #region Imports

import type { PullRequestBaseFilter } from './PullRequestBaseFilter';
import { translateLabel } from '@symphony/frontend-intl/labels';

// #endregion

export const BASE_FILTER_LABELS: Readonly<Record<PullRequestBaseFilter, string>> = {
  get behind() {
    return translateLabel('loc.symphony.labels.behind.a2e9284');
  },
  get conflicting() {
    return translateLabel('loc.symphony.labels.conflicting.d4674ab');
  },
};
