// #region Imports

import type { IExecutionRecord } from '@symphony/domain-execution';

// #endregion

export function resolveImplementationBranchUrl(
  execution: IExecutionRecord | undefined,
): string | undefined {
  return execution?.pullRequest?.branchUrl;
}
