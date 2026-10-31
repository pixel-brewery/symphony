// #region Imports
import { type OrchestrationSnapshotService } from '../../snapshot/OrchestrationSnapshotService';
import { type AnalyzerService } from '@symphony/application-execution';
import { type IStorageWriteAdmission } from '../../storage-governor/IStorageWriteAdmission';
// #endregion

/**
 * Consumes only the capabilities required by execution orchestration.
 *
 * @public
 */
export interface IProvideExecutionOrchestratorFeatureDependencies {
  readonly storageGovernor: IStorageWriteAdmission;
  readonly snapshotService: Pick<OrchestrationSnapshotService, 'snapshot'>;
  readonly service: Pick<
    AnalyzerService,
    | 'executionState'
    | 'requestAnalysis'
    | 'completeManualAnalysis'
    | 'requestSolution'
    | 'delegateWorkItem'
    | 'reviewGoal'
    | 'assessDeliveryGroup'
    | 'groupDeliveryDirectly'
    | 'confirmDeliveryGroup'
    | 'rejectDeliveryGroup'
    | 'dissolveDeliveryGroup'
    | 'alignDeliveryGroup'
    | 'completeManualSolution'
    | 'removeExecutionQueueEntry'
    | 'cancelExecution'
    | 'pauseExecution'
    | 'resumeExecution'
  >;
}
