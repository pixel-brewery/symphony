// #region Imports
import { type MobileAccessService } from '@symphony/application-mobile';
import { type OrchestratorSettingsState } from '../../composition/OrchestratorSettingsState';
import { type OrchestrationSnapshotService } from '../../snapshot/OrchestrationSnapshotService';
import { type WorkItemService } from '@symphony/application-work';
import { type AnalyzerService } from '@symphony/application-execution';
import { type WorkflowEngineService } from '@symphony/application-workflow';
import { type IWorkflowRecord } from '@symphony/domain-workflow';
import { type StructuredLogger } from '@symphony/logging';
import { type IStorageWriteAdmission } from '../../storage-governor/IStorageWriteAdmission';
// #endregion

/**
 * Consumes only the capabilities required by mobileGateway orchestration.
 *
 * @public
 */
export interface ICreateMobileGatewayDependencies {
  readonly mobileAccess: Pick<
    MobileAccessService,
    | 'authorize'
    | 'isEnabled'
    | 'pairingStatus'
    | 'proposePairing'
    | 'setDeviceConnected'
    | 'setRuntime'
  >;
  readonly settingsState: Readonly<Pick<OrchestratorSettingsState, 'current'>>;
  readonly snapshotService: Pick<OrchestrationSnapshotService, 'snapshot'>;
  readonly workItemService: Pick<
    WorkItemService,
    'metadata' | 'create' | 'draft' | 'cancelDraft' | 'move'
  >;
  readonly storageGovernor: IStorageWriteAdmission;
  readonly assertWorkItemStorage: (
    workItemId?: string,
    workload?: 'analysis' | 'implementation',
  ) => Promise<void>;
  readonly service: Pick<
    AnalyzerService,
    | 'requestAnalysis'
    | 'requestSolution'
    | 'cancelExecution'
    | 'removeExecutionQueueEntry'
    | 'publishPullRequest'
  >;
  readonly workflowEngine: Pick<WorkflowEngineService, 'adoptOperatorStage'>;
  readonly recordOperatorDecision: (input: {
    readonly workItemId: string;
    readonly optionId: string;
    readonly note?: string;
    readonly commitSha?: string;
  }) => Promise<IWorkflowRecord | undefined>;
  readonly logger: Pick<StructuredLogger, 'error'>;
}
