// #region Imports

import { type IApplicationSettings } from '@symphony/configuration-composition';
import type { AzureConnection } from './AzureConnection';
import type { IAzureDevOpsCredential } from './IAzureDevOpsCredential';

// #endregion

export interface IAzureDevOpsWorkTrackerOptions {
  readonly settings: () => IApplicationSettings;
  readonly credential: (
    connection: AzureConnection,
  ) => IAzureDevOpsCredential | undefined | Promise<IAzureDevOpsCredential | undefined>;
  readonly fetch?: typeof globalThis.fetch;
}
