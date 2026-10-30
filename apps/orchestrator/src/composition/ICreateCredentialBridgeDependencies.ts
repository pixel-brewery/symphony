// #region Imports
import { type IUtilityParentPort } from './IUtilityParentPort';
import { type AzureDevOpsCredentialBroker } from '../AzureDevOpsCredentialBroker';
// #endregion

/**
 * Consumes only the capabilities required by credentialBridge orchestration.
 *
 * @public
 */
export interface ICreateCredentialBridgeDependencies {
  readonly parentPort: IUtilityParentPort | undefined;
  readonly azureDevOpsCredentials: Pick<
    AzureDevOpsCredentialBroker,
    'synchronizeAvailableReferences'
  >;
  readonly startInitializedBackgroundServices: () => void;
}
