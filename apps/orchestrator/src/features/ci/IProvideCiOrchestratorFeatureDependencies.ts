// #region Imports
import { type OrchestratorSettingsState } from '../../composition/OrchestratorSettingsState';
import {
  type CiRunHistoryService,
  type ILocalCiExecutionRepository,
  type ExternalWriteService,
} from '@symphony/application-ci';
import { type GitHubCloudProvider } from '@symphony/providers-github';
import { type OrchestrationSnapshotService } from '../../snapshot/OrchestrationSnapshotService';
import { type IActiveLocalCiRun } from './IActiveLocalCiRun';
import { type SimulatedCiQueries } from '@symphony/providers-simulated';
// #endregion

/**
 * Consumes only the capabilities required by ci orchestration.
 *
 * @public
 */
export interface IProvideCiOrchestratorFeatureDependencies {
  readonly settingsState: Readonly<Pick<OrchestratorSettingsState, 'current'>>;
  /** Durable workflow-run history: recorded on every refresh, read for reporting. */
  readonly runHistory: Pick<CiRunHistoryService, 'record' | 'list'>;
  readonly localCiRepository: Pick<ILocalCiExecutionRepository, 'listLocalCiExecutions'>;
  readonly github: Pick<
    GitHubCloudProvider,
    | 'readUsage'
    | 'workflowOperationInput'
    | 'checkWorkflowDispatch'
    | 'dispatchWorkflow'
    | 'readKnownRun'
    | 'reconcileWorkflowDispatch'
    | 'checkPendingApproval'
    | 'reviewPendingApprovals'
    | 'hasApprovalReceipt'
    | 'getRunDetails'
    | 'getRunLogChunk'
    | 'cancelRun'
    | 'rerun'
  >;
  readonly snapshotService: Pick<OrchestrationSnapshotService, 'refreshContinuousIntegration'>;
  readonly activeLocalCiRuns: () => ReadonlyMap<string, IActiveLocalCiRun>;
  readonly externalWrites: Pick<ExternalWriteService, 'execute'>;
  readonly localCiSetupDiagnostics: () => ReadonlyMap<string, string>;
  readonly simulatedContinuousIntegrationUsage: SimulatedCiQueries['readUsage'];
  readonly simulatedContinuousIntegration: SimulatedCiQueries['continuousIntegration'];
  readonly simulatedWorkflowDispatch: SimulatedCiQueries['dispatchWorkflow'];
  readonly simulatedContinuousIntegrationDetails: SimulatedCiQueries['runDetails'];
}
