// #region Imports

import type { Signal } from '@angular/core';
import type { ContinuousIntegrationUsageReportDto } from '@symphony/ipc-contracts-ci';

// #endregion

/** Only the optional CI state and commands consumed by the pull-request list. @public */
export interface IDeliveryCiOperations {
  readonly continuousIntegrationUsageBusy: Signal<boolean>;
  refreshContinuousIntegrationUsage(
    repositoryBindingIds?: readonly string[],
    silent?: boolean,
  ): Promise<boolean>;
  continuousIntegrationUsageReport(
    repositoryBindingId: string,
  ): ContinuousIntegrationUsageReportDto | undefined;
  readonly localCiRunningRunId: Signal<string | undefined>;
  readonly localCiStartedAt: Signal<string | undefined>;
  localCiEnabledFor(workspaceId: string | undefined): boolean;
  refreshContinuousIntegrationRuns(includeWorkflowCatalog?: boolean): Promise<void>;
  rerunCiRun(runId: string): Promise<void>;
  runCiLocally(runId: string): Promise<void>;
  cancelLocalCiRun(runId: string): Promise<void>;
  cancelCiRun(runId: string): Promise<void>;
}
