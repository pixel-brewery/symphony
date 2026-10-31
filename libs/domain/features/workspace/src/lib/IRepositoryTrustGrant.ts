// #region Imports

import type { RepositoryExecutionCapability } from './RepositoryExecutionCapability';

// #endregion

/** Machine-local approval for executing code from one immutable repository identity. */
export interface IRepositoryTrustGrant {
  id: string;
  workspaceId: string;
  repositoryBindingId: string;
  repositoryIdentity: string;
  capabilities: readonly RepositoryExecutionCapability[];
  grantedAt: string;
}
