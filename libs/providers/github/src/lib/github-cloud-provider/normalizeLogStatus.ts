// #region Imports

import type { CiRunLogState } from '@symphony/domain-ci';
import { normalizeRunStatus } from './normalizeRunStatus';

// #endregion

export function normalizeLogStatus(status?: string, conclusion?: string | null): CiRunLogState {
  if (status === 'completed' && conclusion === 'skipped') return 'skipped';
  return normalizeRunStatus(status, conclusion);
}
