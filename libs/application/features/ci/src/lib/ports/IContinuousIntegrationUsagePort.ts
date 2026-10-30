// #region Imports

import type { IContinuousIntegrationUsageReport } from './IContinuousIntegrationUsageReport';

// #endregion

/** Reads account-level CI allowance without exposing provider billing response shapes. */
export interface IContinuousIntegrationUsagePort {
  readUsage(
    repositoryBindingIds: readonly string[],
  ): Promise<readonly IContinuousIntegrationUsageReport[]>;
}
