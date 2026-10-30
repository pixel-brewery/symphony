// #region Imports

import type { IExecutionProjectionPort } from '@symphony/application-execution';
import type { IWorkflowRecordRepository } from '@symphony/application-workflow';
import type { ILocalCiExecution } from '@symphony/domain-ci';
import type { IOrchestrationRemoteQueries } from './IOrchestrationRemoteQueries';
import type { IOrchestrationSnapshotCatalog } from './IOrchestrationSnapshotCatalog';

// #endregion

/** Capabilities assembled at the orchestrator boundary. @public */
export interface IOrchestrationSnapshotDependencies {
  readonly execution: IExecutionProjectionPort;
  readonly remoteProjectionQueries: IOrchestrationRemoteQueries;
  readonly catalog: IOrchestrationSnapshotCatalog;
  readonly workflowRecords?: Pick<IWorkflowRecordRepository, 'listWorkflowRecords'>;
  readonly localCiExecutions?: () => readonly ILocalCiExecution[];
}
