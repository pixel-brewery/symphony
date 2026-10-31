// #region Imports
import { type StorageGovernor } from '../storage-governor';
import { type AnalyzerService } from '@symphony/application-execution';
import { type StructuredLogger } from '@symphony/logging';
import { type WorkItemService } from '@symphony/application-work';
import { type IActiveOperation } from './IActiveOperation';
import { type IActiveLocalCiRun } from '../features/ci/IActiveLocalCiRun';
import { type IStorageWriteAdmission } from '../storage-governor/IStorageWriteAdmission';
// #endregion

/**
 * Consumes only the capabilities required by storageSafety orchestration.
 *
 * @public
 */
export interface ICreateStorageSafetyCoordinatorDependencies {
  readonly storageGovernor: IStorageWriteAdmission & Pick<StorageGovernor, 'report' | 'invalidate'>;
  readonly service: Pick<
    AnalyzerService,
    | 'cleanupReclaimableAnalysisWorkspaces'
    | 'activeExecutionRecords'
    | 'cancelExecution'
    | 'cancelActiveExecutions'
  >;
  readonly logger: Pick<StructuredLogger, 'info' | 'error'>;
  readonly workItemService: Pick<WorkItemService, 'activeDraftOperations' | 'cancelActiveDrafts'>;
  readonly activeVerificationRuns: () => ReadonlyMap<string, IActiveOperation>;
  readonly activeLocalCiRuns: () => ReadonlyMap<string, IActiveLocalCiRun>;
}
