// #region Imports

import { type ProviderConnection } from '@symphony/configuration-composition';

// #endregion

export type GitHubConnection = Extract<ProviderConnection, { kind: 'github' }>;
