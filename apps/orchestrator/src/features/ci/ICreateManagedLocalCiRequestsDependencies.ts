// #region Imports
import { type StructuredLogger } from '@symphony/logging';
import { type StorageGovernor } from '../../storage-governor';
import { type GitHubCloudProvider } from '@symphony/providers-github';
import { type OrchestratorSettingsState } from '../../composition/OrchestratorSettingsState';
import { type ILocalCiExecutionRepository } from '@symphony/application-ci';
import { type ManagedLimaGithubRunner } from '@symphony/providers-lima';
import { type RunnerImageCatalogService } from '@symphony/providers-ci';
import { type OrchestrationSnapshotService } from '../../snapshot/OrchestrationSnapshotService';
import { type ICiRun } from '@symphony/domain-ci';
import { type IStorageWriteAdmission } from '../../storage-governor/IStorageWriteAdmission';
// #endregion

/**
 * Consumes only the capabilities required by localCi orchestration.
 *
 * @public
 */
export interface ICreateManagedLocalCiRequestsDependencies {
  readonly logger: Pick<StructuredLogger, 'info' | 'error'>;
  readonly storageGovernor: IStorageWriteAdmission & Pick<StorageGovernor, 'invalidate'>;
  readonly github: Pick<
    GitHubCloudProvider,
    'runWorkspaceId' | 'runLocally' | 'getRunDetails' | 'workflowWorkspaceId' | 'dispatchWorkflow'
  >;
  readonly settingsState: Pick<OrchestratorSettingsState, 'current' | 'save'>;
  readonly localCiRepository: Pick<
    ILocalCiExecutionRepository,
    'saveLocalCiExecution' | 'listLocalCiExecutions'
  >;
  readonly configurationRoot: string;
  readonly managedLocalCiRunner: Pick<
    ManagedLimaGithubRunner,
    'cleanup' | 'instances' | 'removeInstance'
  >;
  readonly runnerImageCatalog: Pick<RunnerImageCatalogService, 'catalog' | 'resolveDefinition'>;
  readonly simulatedContinuousIntegration: () => Awaited<
    ReturnType<OrchestrationSnapshotService['refreshContinuousIntegration']>
  >;
  readonly simulatedWorkflowDispatch: (workflowId: string, ref: string) => ICiRun;
}
