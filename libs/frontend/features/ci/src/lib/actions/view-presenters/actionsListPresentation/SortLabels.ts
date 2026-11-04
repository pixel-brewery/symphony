// #region Imports

import type { ActionsRunSort } from './ActionsRunSort';
import { translateLabel } from '@symphony/frontend-intl/labels';

// #endregion

export const SORT_LABELS: Readonly<Record<ActionsRunSort, string>> = {
  get 'started-descending'() {
    return translateLabel('loc.symphony.labels.newest.d15efa1');
  },
  get 'started-ascending'() {
    return translateLabel('loc.symphony.labels.oldest.505dc45');
  },
};
