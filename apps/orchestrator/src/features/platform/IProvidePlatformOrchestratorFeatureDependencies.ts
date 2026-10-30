// #region Imports
import { type GitHubServiceStatusProvider } from '@symphony/providers-github';
import { type OrchestratorCatalog } from '../../composition/OrchestratorCatalog';
import { type StorageGovernor } from '../../storage-governor';
import { type OrchestratorSettingsState } from '../../composition/OrchestratorSettingsState';
import { type AzureDevOpsCredentialBroker } from '../../AzureDevOpsCredentialBroker';
import { type AzureDevOpsWorkTracker } from '@symphony/providers-azure-devops';
// #endregion

/**
 * Consumes only the capabilities required by platform orchestration.
 *
 * @public
 */
export interface IProvidePlatformOrchestratorFeatureDependencies {
  readonly githubServiceStatus: Pick<GitHubServiceStatusProvider, 'incidents'>;
  readonly catalog: Pick<OrchestratorCatalog, 'health'>;
  readonly storageGovernor: Pick<StorageGovernor, 'report'>;
  readonly settingsState: Pick<OrchestratorSettingsState, 'current' | 'save'>;
  readonly azureDevOpsCredentials: Pick<
    AzureDevOpsCredentialBroker,
    'reference' | 'resolve' | 'set' | 'remove'
  >;
  readonly azureDevOpsTracker: Pick<AzureDevOpsWorkTracker, 'listSourceColumns'> | undefined;
}
