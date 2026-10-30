// #region Imports

import type { ICiRun } from '@symphony/domain-ci';

// #endregion

export function normalizeRunStatus(status?: string, conclusion?: string | null): ICiRun['status'] {
  if (status === 'queued' || status === 'waiting' || status === 'pending') return 'queued';
  if (status !== 'completed') return 'in-progress';
  if (conclusion === 'success' || conclusion === 'neutral' || conclusion === 'skipped') {
    return 'succeeded';
  }
  if (conclusion === 'cancelled') return 'cancelled';
  return 'failed';
}
