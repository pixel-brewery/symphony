// #region Imports

import type { ICiRun } from '@symphony/domain-ci';

// #endregion

export function runTimestamp(run: ICiRun): string {
  return run.startedAt ?? run.finishedAt ?? '';
}
