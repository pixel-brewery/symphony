// #region Imports

import { type ProviderConnection } from '@symphony/configuration-composition';

// #endregion

export type AzureConnection = Extract<ProviderConnection, { kind: 'azure-devops' }>;
