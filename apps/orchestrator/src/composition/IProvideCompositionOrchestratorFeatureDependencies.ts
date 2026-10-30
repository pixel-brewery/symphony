// #region Imports
import { type OrchestrationSnapshotService } from '../snapshot/OrchestrationSnapshotService';
import { type IProviderConnectionStatus } from '@symphony/domain-platform';
import { type AzureDevOpsCredentialBroker } from '../AzureDevOpsCredentialBroker';
import { type OrchestratorSettingsState } from './OrchestratorSettingsState';
import { type GitHubCloudProvider } from '@symphony/providers-github';
// #endregion

/**
 * Consumes only the capabilities required by composition orchestration.
 *
 * @public
 */
export interface IProvideCompositionOrchestratorFeatureDependencies {
  readonly snapshotService: Pick<OrchestrationSnapshotService, 'snapshot' | 'refreshSnapshot'>;
  readonly readNativeConnectionStatus: () => Promise<IProviderConnectionStatus>;
  readonly azureDevOpsCredentials: Pick<AzureDevOpsCredentialBroker, 'status'>;
  readonly settingsState: Readonly<Pick<OrchestratorSettingsState, 'current'>>;
  readonly github: Pick<GitHubCloudProvider, 'inspectDraftRepository'>;
}
