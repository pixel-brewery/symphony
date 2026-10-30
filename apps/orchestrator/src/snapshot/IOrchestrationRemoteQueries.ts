// #region Imports

import type { RemoteProjectionSnapshot } from '@symphony/application-composition';
import type { ICiRun, ICiWorkflow } from '@symphony/domain-ci';
import type { IRemoteDataStatus } from '@symphony/domain-core';

// #endregion

/** Joined feature reads consumed by the orchestrator composition. @public */
export interface IOrchestrationRemoteQueries {
  snapshot(forceRefresh?: boolean): Promise<RemoteProjectionSnapshot>;
  refresh(): Promise<RemoteProjectionSnapshot>;
  refreshContinuousIntegration(includeWorkflowCatalog?: boolean): Promise<{
    readonly ciWorkflows: readonly ICiWorkflow[];
    readonly ciRuns: readonly ICiRun[];
    readonly status: IRemoteDataStatus;
  }>;
}
