// #region Imports

import type { ICiRun } from '@symphony/domain-ci';

// #endregion

export const RUN_STATUSES: readonly ICiRun['status'][] = [
  'queued',
  'in-progress',
  'succeeded',
  'failed',
  'cancelled',
];
