// #region Imports

import { type WorkItemSource } from '@symphony/domain-work';

// #endregion

export type AzureSource = Extract<WorkItemSource, { provider: 'azure-devops' }>;
