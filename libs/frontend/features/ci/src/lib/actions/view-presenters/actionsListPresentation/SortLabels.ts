// #region Imports

import type { ActionsRunSort } from './ActionsRunSort';

// #endregion

export const SORT_LABELS: Readonly<Record<ActionsRunSort, string>> = {
  'started-descending': 'Newest',
  'started-ascending': 'Oldest',
};
